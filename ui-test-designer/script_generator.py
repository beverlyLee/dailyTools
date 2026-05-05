from typing import List, Dict, Any
import re


class PlaywrightScriptGenerator:
    def __init__(self):
        self.indent_level = 0

    def generate(
        self,
        steps: List[Dict[str, Any]],
        test_name: str = "test_ui",
        use_async: bool = True,
        browser: str = "chromium",
        headless: bool = True
    ) -> str:
        lines = []

        lines.extend(self._generate_imports(use_async))
        lines.append("")

        if use_async:
            lines.extend(self._generate_async_test(steps, test_name, browser, headless))
        else:
            lines.extend(self._generate_sync_test(steps, test_name, browser, headless))

        lines.append("")
        lines.extend(self._generate_main_block(use_async, test_name))

        return "\n".join(lines)

    def _generate_imports(self, use_async: bool) -> List[str]:
        if use_async:
            return [
                "import asyncio",
                "import pytest",
                "from playwright.async_api import async_playwright, expect"
            ]
        else:
            return [
                "import pytest",
                "from playwright.sync_api import sync_playwright, expect"
            ]

    def _generate_async_test(
        self,
        steps: List[Dict[str, Any]],
        test_name: str,
        browser: str,
        headless: bool
    ) -> List[str]:
        lines = []

        lines.append(f"@pytest.mark.asyncio")
        lines.append(f"async def {test_name}():")
        lines.append("    async with async_playwright() as p:")
        lines.append(f"        browser = await p.{browser}.launch(headless={headless})")
        lines.append("        context = await browser.new_context()")
        lines.append("        page = await context.new_page()")
        lines.append("")

        for step in steps:
            step_lines = self._generate_step(step, indent="        ", use_async=True)
            lines.extend(step_lines)

        lines.append("")
        lines.append("        await browser.close()")

        return lines

    def _generate_sync_test(
        self,
        steps: List[Dict[str, Any]],
        test_name: str,
        browser: str,
        headless: bool
    ) -> List[str]:
        lines = []

        lines.append(f"def {test_name}():")
        lines.append("    with sync_playwright() as p:")
        lines.append(f"        browser = p.{browser}.launch(headless={headless})")
        lines.append("        context = browser.new_context()")
        lines.append("        page = context.new_page()")
        lines.append("")

        for step in steps:
            step_lines = self._generate_step(step, indent="        ", use_async=False)
            lines.extend(step_lines)

        lines.append("")
        lines.append("        browser.close()")

        return lines

    def _generate_step(
        self,
        step: Dict[str, Any],
        indent: str,
        use_async: bool = True
    ) -> List[str]:
        lines = []
        action = step.get("action", step.get("action_type", ""))
        selector = step.get("selector", step.get("element", ""))
        value = step.get("value", "")
        assertion = step.get("assertion", step.get("assertion_type", ""))

        await_prefix = "await " if use_async else ""

        if action == "goto":
            url = step.get("url", value)
            if url:
                lines.append(f'{indent}{await_prefix}page.goto("{url}")')

        elif action == "click":
            if selector:
                lines.append(f'{indent}{await_prefix}page.click("{selector}")')

        elif action == "fill":
            if selector and value:
                lines.append(f'{indent}{await_prefix}page.fill("{selector}", "{value}")')

        elif action == "type":
            if selector and value:
                lines.append(f'{indent}{await_prefix}page.type("{selector}", "{value}")')

        elif action == "select":
            if selector and value:
                lines.append(f'{indent}{await_prefix}page.select_option("{selector}", "{value}")')

        elif action == "hover":
            if selector:
                lines.append(f'{indent}{await_prefix}page.hover("{selector}")')

        elif action == "wait_for_selector":
            timeout = step.get("timeout", 30000)
            if selector:
                lines.append(f'{indent}{await_prefix}page.wait_for_selector("{selector}", timeout={timeout})')

        elif action == "wait" or action == "wait_for_load_state":
            state = step.get("state", "load")
            lines.append(f'{indent}{await_prefix}page.wait_for_load_state("{state}")')

        elif action == "assert" or assertion:
            lines.extend(self._generate_assertion(step, indent, use_async))

        elif action == "screenshot":
            path = step.get("path", "screenshot.png")
            lines.append(f'{indent}{await_prefix}page.screenshot(path="{path}")')

        if lines:
            comment = step.get("comment", "")
            if comment:
                lines[0] = f'{lines[0]}  # {comment}'

        return lines

    def _generate_assertion(
        self,
        step: Dict[str, Any],
        indent: str,
        use_async: bool = True
    ) -> List[str]:
        lines = []
        selector = step.get("selector", step.get("element", ""))
        assertion = step.get("assertion", step.get("assertion_type", ""))
        expected_value = step.get("expected_value", step.get("value", ""))

        await_prefix = "await " if use_async else ""

        if assertion == "visible" or assertion == "to_be_visible":
            if selector:
                lines.append(f'{indent}{await_prefix}expect(page.locator("{selector}")).to_be_visible()')

        elif assertion == "hidden" or assertion == "to_be_hidden":
            if selector:
                lines.append(f'{indent}{await_prefix}expect(page.locator("{selector}")).to_be_hidden()')

        elif assertion == "enabled" or assertion == "to_be_enabled":
            if selector:
                lines.append(f'{indent}{await_prefix}expect(page.locator("{selector}")).to_be_enabled()')

        elif assertion == "disabled" or assertion == "to_be_disabled":
            if selector:
                lines.append(f'{indent}{await_prefix}expect(page.locator("{selector}")).to_be_disabled()')

        elif assertion == "text" or assertion == "to_have_text":
            if selector and expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page.locator("{selector}")).to_have_text("{expected_value}")'
                )

        elif assertion == "contain_text" or assertion == "to_contain_text":
            if selector and expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page.locator("{selector}")).to_contain_text("{expected_value}")'
                )

        elif assertion == "value" or assertion == "to_have_value":
            if selector and expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page.locator("{selector}")).to_have_value("{expected_value}")'
                )

        elif assertion == "count" or assertion == "to_have_count":
            if selector and expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page.locator("{selector}")).to_have_count({expected_value})'
                )

        elif assertion == "url" or assertion == "to_have_url":
            if expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page).to_have_url("{expected_value}")'
                )

        elif assertion == "title" or assertion == "to_have_title":
            if expected_value:
                lines.append(
                    f'{indent}{await_prefix}expect(page).to_have_title("{expected_value}")'
                )

        return lines

    def _generate_main_block(self, use_async: bool, test_name: str) -> List[str]:
        if use_async:
            return [
                "if __name__ == '__main__':",
                f"    asyncio.run({test_name}())"
            ]
        else:
            return [
                "if __name__ == '__main__':",
                f"    {test_name}()"
            ]

    def generate_pytest_suite(
        self,
        test_cases: List[Dict[str, Any]],
        suite_name: str = "test_suite"
    ) -> str:
        lines = []

        lines.extend(self._generate_imports(use_async=True))
        lines.append("")
        lines.append(f"class Test{suite_name.capitalize()}:")
        lines.append("")

        for i, test_case in enumerate(test_cases):
            test_name = test_case.get("name", f"test_case_{i + 1}")
            steps = test_case.get("steps", [])

            lines.append(f"    @pytest.mark.asyncio")
            lines.append(f"    async def {self._sanitize_name(test_name)}(self):")
            lines.append("        async with async_playwright() as p:")
            lines.append("            browser = await p.chromium.launch(headless=True)")
            lines.append("            context = await browser.new_context()")
            lines.append("            page = await context.new_page()")
            lines.append("")

            for step in steps:
                step_lines = self._generate_step(step, indent="            ", use_async=True)
                lines.extend(step_lines)

            lines.append("")
            lines.append("            await browser.close()")
            lines.append("")

        return "\n".join(lines)

    def _sanitize_name(self, name: str) -> str:
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        if not name.startswith('test_'):
            name = f'test_{name}'
        return name.lower()

    def generate_cicd_yaml(
        self,
        test_files: List[str],
        browser: str = "chromium",
        python_version: str = "3.10"
    ) -> str:
        yaml_content = f"""name: UI Automation Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * *'

jobs:
  ui-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python {python_version}
      uses: actions/setup-python@v5
      with:
        python-version: '{python_version}'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Install Playwright browsers
      run: playwright install {browser} --with-deps
    
    - name: Run UI tests
      run: |
        pytest { ' '.join(test_files) } -v --alluredir=allure-results
    
    - name: Generate Allure Report
      uses: simple-elf/allure-report-action@master
      if: always()
      with:
        allure_results: allure-results
        allure_history: allure-history
    
    - name: Deploy report to Pages
      if: always()
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{{{ secrets.GITHUB_TOKEN }}}}
        publish_dir: allure-history
"""
        return yaml_content
