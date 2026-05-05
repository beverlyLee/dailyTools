from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright, Page, Locator


class LocatorValidator:
    def __init__(self):
        self.suggestions: List[str] = []

    async def validate(
        self,
        url: str,
        locator_type: str,
        locator_value: str,
        headless: bool = True
    ) -> Dict[str, Any]:
        self.suggestions = []
        result = {
            "valid": False,
            "message": "",
            "element_count": 0,
            "suggestions": [],
            "details": {}
        }

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=headless)
                context = await browser.new_context()
                page = await context.new_page()

                await page.goto(url, wait_until="networkidle")

                locator = await self._get_locator(page, locator_type, locator_value)

                if locator is None:
                    result["message"] = f"无效的定位器类型: {locator_type}"
                    await browser.close()
                    return result

                element_count = await locator.count()
                result["element_count"] = element_count

                if element_count == 0:
                    result["valid"] = False
                    result["message"] = "未找到匹配的元素"
                    await self._generate_suggestions(page, locator_type, locator_value)
                elif element_count == 1:
                    result["valid"] = True
                    result["message"] = "定位器有效，找到唯一匹配的元素"
                    result["details"] = await self._get_element_details(locator.first)
                else:
                    result["valid"] = False
                    result["message"] = f"定位器匹配到 {element_count} 个元素，不够唯一"
                    result["details"] = await self._get_multiple_elements_details(locator)

                result["suggestions"] = self.suggestions
                await browser.close()

        except Exception as e:
            result["message"] = f"验证过程中发生错误: {str(e)}"

        return result

    async def _get_locator(self, page: Page, locator_type: str, locator_value: str) -> Optional[Locator]:
        locator = None

        if locator_type == "css" or locator_type == "selector":
            locator = page.locator(locator_value)
        elif locator_type == "xpath":
            locator = page.locator(f"xpath={locator_value}")
        elif locator_type == "text":
            locator = page.get_by_text(locator_value)
        elif locator_type == "role":
            locator = page.get_by_role(locator_value)
        elif locator_type == "label":
            locator = page.get_by_label(locator_value)
        elif locator_type == "placeholder":
            locator = page.get_by_placeholder(locator_value)
        elif locator_type == "title":
            locator = page.get_by_title(locator_value)
        elif locator_type == "testid":
            locator = page.get_by_test_id(locator_value)

        return locator

    async def _get_element_details(self, locator: Locator) -> Dict[str, Any]:
        details = {}

        try:
            details["tag_name"] = await locator.evaluate("el => el.tagName")
            details["text_content"] = await locator.evaluate("el => el.textContent?.trim()")
            details["id"] = await locator.evaluate("el => el.id")
            details["class_name"] = await locator.evaluate("el => el.className")
            details["visible"] = await locator.is_visible()
            details["enabled"] = await locator.is_enabled()
            details["editable"] = await locator.is_editable() if hasattr(locator, 'is_editable') else None

            bounding_box = await locator.bounding_box()
            if bounding_box:
                details["position"] = {
                    "x": bounding_box["x"],
                    "y": bounding_box["y"],
                    "width": bounding_box["width"],
                    "height": bounding_box["height"]
                }

        except Exception:
            pass

        return details

    async def _get_multiple_elements_details(self, locator: Locator) -> Dict[str, Any]:
        details = {"elements": []}
        count = await locator.count()

        for i in range(min(count, 5)):
            element_locator = locator.nth(i)
            try:
                element_details = {
                    "index": i,
                    "tag_name": await element_locator.evaluate("el => el.tagName"),
                    "text_content": await element_locator.evaluate("el => el.textContent?.trim()"),
                    "visible": await element_locator.is_visible()
                }
                details["elements"].append(element_details)
            except Exception:
                pass

        if count > 5:
            details["more_elements"] = count - 5

        return details

    async def _generate_suggestions(self, page: Page, locator_type: str, locator_value: str):
        self.suggestions = []

        self.suggestions.append("建议使用 data-testid 属性进行定位，这是最稳定的定位方式")
        self.suggestions.append("避免使用动态生成的 ID 或类名")
        self.suggestions.append("优先使用 CSS 选择器或 XPath，它们最灵活")

        if locator_type == "css":
            if "#" in locator_value:
                self.suggestions.append(f"如果 ID 是动态的，尝试使用类名或其他属性: .className 或 [attribute='value']")
            elif "." in locator_value:
                self.suggestions.append(f"如果类名不够唯一，尝试组合使用: div.className[data-testid='xxx']")
            elif "[" in locator_value:
                self.suggestions.append(f"属性选择器是好的做法，确保属性值稳定")

        if locator_type == "xpath":
            self.suggestions.append(f"XPath 可以使用 contains() 或 starts-with() 来处理动态值")
            self.suggestions.append(f"例如: //div[contains(@class, 'item')]")

        try:
            all_buttons = await page.get_by_role("button").count()
            all_links = await page.get_by_role("link").count()
            all_inputs = await page.get_by_role("textbox").count()

            if all_buttons > 0:
                self.suggestions.append(f"页面上有 {all_buttons} 个按钮，可以使用 get_by_role('button') 定位")
            if all_links > 0:
                self.suggestions.append(f"页面上有 {all_links} 个链接，可以使用 get_by_role('link') 定位")
            if all_inputs > 0:
                self.suggestions.append(f"页面上有 {all_inputs} 个输入框，可以使用 get_by_role('textbox') 或 get_by_placeholder() 定位")

        except Exception:
            pass


class LocatorOptimizer:
    def __init__(self):
        pass

    def optimize(self, selector: str, element_info: Dict[str, Any]) -> Dict[str, Any]:
        suggestions = []
        optimized_selectors = []

        if element_info.get("id"):
            optimized_selectors.append({
                "selector": f"#{element_info['id']}",
                "type": "css",
                "stability": "high",
                "reason": "ID 选择器是最快且最稳定的"
            })

        testid = element_info.get("testid", "")
        if testid:
            optimized_selectors.append({
                "selector": f"[data-testid='{testid}']",
                "type": "css",
                "stability": "high",
                "reason": "data-testid 是专为测试设计的属性"
            })

        tag_name = element_info.get("tag_name", "").lower()
        class_name = element_info.get("class_name", "")

        if class_name:
            classes = [c for c in class_name.split() if not self._is_dynamic_class(c)]
            if classes:
                optimized_selectors.append({
                    "selector": f"{tag_name}.{classes[0]}" if classes else tag_name,
                    "type": "css",
                    "stability": "medium",
                    "reason": "类名选择器，确保类名稳定"
                })

        text_content = element_info.get("text_content", "")
        if text_content and len(text_content) <= 50:
            optimized_selectors.append({
                "selector": text_content,
                "type": "text",
                "stability": "medium",
                "reason": "文本定位，适合静态文本"
            })

        return {
            "original_selector": selector,
            "optimized_selectors": optimized_selectors,
            "suggestions": suggestions
        }

    def _is_dynamic_class(self, class_name: str) -> bool:
        dynamic_patterns = [
            "css-", "Mui-", "sc-", "css_",
            "-", "__", "--"
        ]

        if any(class_name.startswith(p) for p in dynamic_patterns[:4]):
            return True

        if any(p in class_name for p in ["_", "-"]) and len(class_name) > 15:
            return True

        return False


class AssertionGenerator:
    def __init__(self):
        self.assertion_types = {
            "visible": {
                "name": "元素可见性",
                "description": "验证元素是否可见",
                "code": "expect(page.locator('{selector}')).to_be_visible()",
                "supports_value": False
            },
            "hidden": {
                "name": "元素隐藏",
                "description": "验证元素是否隐藏",
                "code": "expect(page.locator('{selector}')).to_be_hidden()",
                "supports_value": False
            },
            "enabled": {
                "name": "元素启用",
                "description": "验证元素是否启用",
                "code": "expect(page.locator('{selector}')).to_be_enabled()",
                "supports_value": False
            },
            "disabled": {
                "name": "元素禁用",
                "description": "验证元素是否禁用",
                "code": "expect(page.locator('{selector}')).to_be_disabled()",
                "supports_value": False
            },
            "text": {
                "name": "文本内容",
                "description": "验证元素文本完全匹配",
                "code": "expect(page.locator('{selector}')).to_have_text('{value}')",
                "supports_value": True
            },
            "contain_text": {
                "name": "包含文本",
                "description": "验证元素包含指定文本",
                "code": "expect(page.locator('{selector}')).to_contain_text('{value}')",
                "supports_value": True
            },
            "value": {
                "name": "输入框值",
                "description": "验证输入框的值",
                "code": "expect(page.locator('{selector}')).to_have_value('{value}')",
                "supports_value": True
            },
            "count": {
                "name": "元素数量",
                "description": "验证匹配元素的数量",
                "code": "expect(page.locator('{selector}')).to_have_count({value})",
                "supports_value": True
            },
            "attribute": {
                "name": "属性值",
                "description": "验证元素属性值",
                "code": "expect(page.locator('{selector}')).to_have_attribute('{attr_name}', '{value}')",
                "supports_value": True,
                "requires_attr": True
            },
            "url": {
                "name": "URL 匹配",
                "description": "验证当前页面 URL",
                "code": "expect(page).to_have_url('{value}')",
                "supports_value": True,
                "no_selector": True
            },
            "title": {
                "name": "页面标题",
                "description": "验证页面标题",
                "code": "expect(page).to_have_title('{value}')",
                "supports_value": True,
                "no_selector": True
            }
        }

    def get_assertion_types(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": key,
                "name": value["name"],
                "description": value["description"],
                "supports_value": value["supports_value"]
            }
            for key, value in self.assertion_types.items()
        ]

    def generate_assertion(
        self,
        assertion_type: str,
        selector: str,
        value: str = None,
        attr_name: str = None
    ) -> Dict[str, Any]:
        if assertion_type not in self.assertion_types:
            return {"error": f"未知的断言类型: {assertion_type}"}

        assertion_info = self.assertion_types[assertion_type]
        code = assertion_info["code"]

        if assertion_info.get("no_selector"):
            if value:
                code = code.replace("{value}", value)
        else:
            code = code.replace("{selector}", selector)
            if assertion_info.get("supports_value") and value:
                code = code.replace("{value}", value)
            if assertion_info.get("requires_attr") and attr_name:
                code = code.replace("{attr_name}", attr_name)

        return {
            "type": assertion_type,
            "name": assertion_info["name"],
            "code": code,
            "selector": selector,
            "value": value
        }

    def suggest_assertions(self, element_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        suggestions = []

        suggestions.append(self.generate_assertion("visible", element_info.get("selector", "")))

        text_content = element_info.get("text_content", "")
        if text_content:
            suggestions.append(self.generate_assertion(
                "contain_text",
                element_info.get("selector", ""),
                text_content[:30]
            ))

        tag_name = element_info.get("tag_name", "").lower()
        if tag_name in ["input", "textarea", "select"]:
            value = element_info.get("value", "")
            if value:
                suggestions.append(self.generate_assertion(
                    "value",
                    element_info.get("selector", ""),
                    value
                ))

        visible = element_info.get("visible", True)
        if not visible:
            suggestions.append(self.generate_assertion("hidden", element_info.get("selector", "")))

        return suggestions
