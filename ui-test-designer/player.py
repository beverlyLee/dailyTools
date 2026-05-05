from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright, expect
from dataclasses import dataclass
from datetime import datetime
import asyncio


@dataclass
class PlaybackResult:
    step_index: int
    action: str
    status: str
    message: str
    duration: float
    screenshot: Optional[str] = None
    error_details: Optional[str] = None


class TestPlayer:
    def __init__(self):
        self.results: List[PlaybackResult] = []
        self.current_step = 0

    async def play(
        self,
        steps: List[Dict[str, Any]],
        headless: bool = True,
        browser: str = "chromium",
        slow_mo: int = 0,
        timeout: int = 30000
    ) -> List[PlaybackResult]:
        self.results = []

        async with async_playwright() as p:
            browser_instance = await getattr(p, browser).launch(
                headless=headless,
                slow_mo=slow_mo
            )
            context = await browser_instance.new_context()
            page = await context.new_page()
            page.set_default_timeout(timeout)

            for i, step in enumerate(steps):
                self.current_step = i
                result = await self._execute_step(page, step, i)
                self.results.append(result)

            await browser_instance.close()

        return self.results

    async def _execute_step(
        self,
        page,
        step: Dict[str, Any],
        index: int
    ) -> PlaybackResult:
        start_time = datetime.now()
        action = step.get("action", step.get("action_type", "")).lower()
        selector = step.get("selector", step.get("element", ""))
        value = step.get("value", "")
        assertion = step.get("assertion", step.get("assertion_type", ""))

        try:
            if action == "goto":
                url = step.get("url", value)
                if url:
                    await page.goto(url, wait_until="networkidle")
                    message = f"成功导航到: {url}"
                else:
                    raise ValueError("缺少 URL 参数")

            elif action == "click":
                if selector:
                    await page.click(selector)
                    message = f"成功点击元素: {selector}"
                else:
                    raise ValueError("缺少选择器参数")

            elif action == "fill":
                if selector and value is not None:
                    await page.fill(selector, value)
                    message = f"成功填充元素: {selector} = {value}"
                else:
                    raise ValueError("缺少选择器或值参数")

            elif action == "type":
                if selector and value is not None:
                    await page.type(selector, value)
                    message = f"成功输入文本: {selector} = {value}"
                else:
                    raise ValueError("缺少选择器或值参数")

            elif action == "select":
                if selector and value is not None:
                    await page.select_option(selector, value)
                    message = f"成功选择选项: {selector} = {value}"
                else:
                    raise ValueError("缺少选择器或值参数")

            elif action == "hover":
                if selector:
                    await page.hover(selector)
                    message = f"成功悬停在元素上: {selector}"
                else:
                    raise ValueError("缺少选择器参数")

            elif action == "wait_for_selector":
                if selector:
                    timeout = step.get("timeout", 30000)
                    await page.wait_for_selector(selector, timeout=timeout)
                    message = f"成功等待元素: {selector}"
                else:
                    raise ValueError("缺少选择器参数")

            elif action == "wait" or action == "wait_for_load_state":
                state = step.get("state", "load")
                await page.wait_for_load_state(state)
                message = f"成功等待页面状态: {state}"

            elif action == "screenshot":
                path = step.get("path", f"screenshot_step_{index}.png")
                await page.screenshot(path=path)
                message = f"成功截图: {path}"

            elif assertion:
                await self._execute_assertion(page, step)
                message = f"断言成功: {assertion}"

            else:
                raise ValueError(f"未知的操作类型: {action}")

            duration = (datetime.now() - start_time).total_seconds()
            return PlaybackResult(
                step_index=index,
                action=action,
                status="通过",
                message=message,
                duration=duration
            )

        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            screenshot = None
            try:
                screenshot_path = f"error_step_{index}.png"
                await page.screenshot(path=screenshot_path)
                screenshot = screenshot_path
            except:
                pass

            return PlaybackResult(
                step_index=index,
                action=action,
                status="失败",
                message=f"操作失败: {str(e)}",
                duration=duration,
                screenshot=screenshot,
                error_details=str(e)
            )

    async def _execute_assertion(self, page, step: Dict[str, Any]):
        selector = step.get("selector", step.get("element", ""))
        assertion = step.get("assertion", step.get("assertion_type", ""))
        expected_value = step.get("expected_value", step.get("value", ""))
        attr_name = step.get("attr_name", "")

        if assertion == "visible" or assertion == "to_be_visible":
            await expect(page.locator(selector)).to_be_visible()

        elif assertion == "hidden" or assertion == "to_be_hidden":
            await expect(page.locator(selector)).to_be_hidden()

        elif assertion == "enabled" or assertion == "to_be_enabled":
            await expect(page.locator(selector)).to_be_enabled()

        elif assertion == "disabled" or assertion == "to_be_disabled":
            await expect(page.locator(selector)).to_be_disabled()

        elif assertion == "text" or assertion == "to_have_text":
            await expect(page.locator(selector)).to_have_text(expected_value)

        elif assertion == "contain_text" or assertion == "to_contain_text":
            await expect(page.locator(selector)).to_contain_text(expected_value)

        elif assertion == "value" or assertion == "to_have_value":
            await expect(page.locator(selector)).to_have_value(expected_value)

        elif assertion == "count" or assertion == "to_have_count":
            await expect(page.locator(selector)).to_have_count(int(expected_value))

        elif assertion == "attribute" or assertion == "to_have_attribute":
            await expect(page.locator(selector)).to_have_attribute(attr_name, expected_value)

        elif assertion == "url" or assertion == "to_have_url":
            await expect(page).to_have_url(expected_value)

        elif assertion == "title" or assertion == "to_have_title":
            await expect(page).to_have_title(expected_value)

        else:
            raise ValueError(f"未知的断言类型: {assertion}")

    def get_summary(self) -> Dict[str, Any]:
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "通过")
        failed = total - passed
        total_duration = sum(r.duration for r in self.results)

        return {
            "total_steps": total,
            "passed": passed,
            "failed": failed,
            "total_duration": total_duration,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": [
                {
                    "step_index": r.step_index,
                    "action": r.action,
                    "status": r.status,
                    "message": r.message,
                    "duration": r.duration,
                    "screenshot": r.screenshot
                }
                for r in self.results
            ]
        }


class ParallelTestExecutor:
    def __init__(self):
        pass

    async def execute_parallel(
        self,
        test_cases: List[Dict[str, Any]],
        max_workers: int = 3
    ) -> Dict[str, Any]:
        semaphore = asyncio.Semaphore(max_workers)

        async def run_with_semaphore(test_case):
            async with semaphore:
                player = TestPlayer()
                steps = test_case.get("steps", [])
                name = test_case.get("name", f"Test {id(test_case)}")

                try:
                    results = await player.play(steps)
                    summary = player.get_summary()
                    return {
                        "name": name,
                        "status": "通过" if summary["failed"] == 0 else "失败",
                        "summary": summary
                    }
                except Exception as e:
                    return {
                        "name": name,
                        "status": "错误",
                        "error": str(e)
                    }

        tasks = [run_with_semaphore(tc) for tc in test_cases]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        total = len(results)
        passed = sum(1 for r in results if r["status"] == "通过")
        failed = total - passed

        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": results
        }
