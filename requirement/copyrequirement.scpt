on run argv
	if (count of argv) is 0 then
		display alert "Usage: osascript trae_new_task.scpt \"需求文本\""
		return
	end if

	set theText to item 1 of argv

	-- 1) 激活 Trae（应用名一般是 Trae，若你的是 Trae CN 就改这里）
	tell application "Trae" to activate
	delay 0.6

	-- 2) 新建 SOLO 新任务：Cmd+Ctrl+N
	tell application "System Events"
		tell process "Trae"
			keystroke "n" using {command down, control down}
		end tell
	end tell
	delay 0.6

	-- 3) 粘贴文本到输入框（剪贴板方式最稳）
	set the clipboard to theText
	tell application "System Events"
		tell process "Trae"
			keystroke "v" using {command down}
		end tell
	end tell
end run