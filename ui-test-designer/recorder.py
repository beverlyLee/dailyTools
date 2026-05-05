import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from playwright.async_api import async_playwright, Page, Browser, BrowserContext


@dataclass
class RecordedStep:
    timestamp: str
    action: str
    element: Optional[str] = None
    value: Optional[str] = None
    selector: Optional[str] = None
    xpath: Optional[str] = None
    assertion: Optional[str] = None


class UIRecorder:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.recorded_steps: List[RecordedStep] = []
        self.is_recording: bool = False

    async def start_recording(self, url: str, headless: bool = False) -> List[RecordedStep]:
        self.recorded_steps = []
        self.is_recording = True

        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 720}
        )
        self.page = await self.context.new_page()

        await self._setup_listeners()

        self.recorded_steps.append(RecordedStep(
            timestamp=datetime.now().isoformat(),
            action="goto",
            value=url
        ))
        await self.page.goto(url)

        return self.recorded_steps

    async def _setup_listeners(self):
        if not self.page:
            return

        self.page.on("click", self._on_click)
        self.page.on("fill", self._on_fill)
        self.page.on("select", self._on_select)
        self.page.on("framenavigated", self._on_navigate)

    async def _on_click(self, locator):
        if not self.is_recording:
            return

        selector = await self._get_selector(locator)
        xpath = await self._get_xpath(locator)

        step = RecordedStep(
            timestamp=datetime.now().isoformat(),
            action="click",
            selector=selector,
            xpath=xpath,
            element=selector
        )
        self.recorded_steps.append(step)

    async def _on_fill(self, locator, value):
        if not self.is_recording:
            return

        selector = await self._get_selector(locator)
        xpath = await self._get_xpath(locator)

        step = RecordedStep(
            timestamp=datetime.now().isoformat(),
            action="fill",
            selector=selector,
            xpath=xpath,
            element=selector,
            value=value
        )
        self.recorded_steps.append(step)

    async def _on_select(self, locator, value):
        if not self.is_recording:
            return

        selector = await self._get_selector(locator)
        xpath = await self._get_xpath(locator)

        step = RecordedStep(
            timestamp=datetime.now().isoformat(),
            action="select",
            selector=selector,
            xpath=xpath,
            element=selector,
            value=value
        )
        self.recorded_steps.append(step)

    async def _on_navigate(self, frame):
        if not self.is_recording:
            return

        url = frame.url
        step = RecordedStep(
            timestamp=datetime.now().isoformat(),
            action="goto",
            value=url
        )
        self.recorded_steps.append(step)

    async def _get_selector(self, locator) -> str:
        try:
            element = locator
            tag_name = await element.evaluate("el => el.tagName.toLowerCase()")

            id_attr = await element.evaluate("el => el.id")
            if id_attr:
                return f"#{id_attr}"

            class_attr = await element.evaluate("el => el.className")
            if class_attr and not class_attr.strip().startswith(" "):
                classes = class_attr.strip().split()
                if classes:
                    return f"{tag_name}.{classes[0]}"

            data_testid = await element.evaluate("el => el.getAttribute('data-testid')")
            if data_testid:
                return f"[data-testid='{data_testid}']"

            name_attr = await element.evaluate("el => el.getAttribute('name')")
            if name_attr:
                return f"[name='{name_attr}']"

            return tag_name
        except Exception:
            return "body"

    async def _get_xpath(self, locator) -> str:
        try:
            return await locator.evaluate("""el => {
                function getXPath(element) {
                    if (element.id) return '//*[@id="' + element.id + '"]';
                    if (element === document.body) return '//' + element.tagName.toLowerCase();

                    let ix = 0;
                    const siblings = element.parentNode.childNodes;
                    for (let i = 0; i < siblings.length; i++) {
                        const sibling = siblings[i];
                        if (sibling === element) {
                            return getXPath(element.parentNode) + '/' + 
                                   element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                        }
                        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
                    }
                }
                return getXPath(el);
            }""")
        except Exception:
            return "//body"

    async def add_assertion(self, step_index: int, assertion_type: str, value: str = None):
        if 0 <= step_index < len(self.recorded_steps):
            self.recorded_steps[step_index].assertion = assertion_type
            if value:
                self.recorded_steps[step_index].value = value

    async def stop_recording(self) -> List[Dict[str, Any]]:
        self.is_recording = False

        if self.browser:
            await self.browser.close()

        return [asdict(step) for step in self.recorded_steps]

    def get_steps(self) -> List[Dict[str, Any]]:
        return [asdict(step) for step in self.recorded_steps]


class StepRecorder:
    def __init__(self):
        self.steps: List[Dict[str, Any]] = []

    def record_goto(self, url: str):
        self.steps.append({
            "action": "goto",
            "url": url,
            "timestamp": datetime.now().isoformat()
        })

    def record_click(self, selector: str):
        self.steps.append({
            "action": "click",
            "selector": selector,
            "timestamp": datetime.now().isoformat()
        })

    def record_fill(self, selector: str, value: str):
        self.steps.append({
            "action": "fill",
            "selector": selector,
            "value": value,
            "timestamp": datetime.now().isoformat()
        })

    def record_select(self, selector: str, value: str):
        self.steps.append({
            "action": "select",
            "selector": selector,
            "value": value,
            "timestamp": datetime.now().isoformat()
        })

    def record_hover(self, selector: str):
        self.steps.append({
            "action": "hover",
            "selector": selector,
            "timestamp": datetime.now().isoformat()
        })

    def record_wait(self, selector: str, timeout: int = 30000):
        self.steps.append({
            "action": "wait_for_selector",
            "selector": selector,
            "timeout": timeout,
            "timestamp": datetime.now().isoformat()
        })

    def record_assertion(self, selector: str, assertion_type: str, expected_value: str = None):
        self.steps.append({
            "action": "assert",
            "selector": selector,
            "assertion_type": assertion_type,
            "expected_value": expected_value,
            "timestamp": datetime.now().isoformat()
        })

    def get_steps(self) -> List[Dict[str, Any]]:
        return self.steps.copy()

    def clear(self):
        self.steps = []
