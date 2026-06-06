#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session import get_chat_sessions

sessions = get_chat_sessions()
print(f"Chat sessions 总数: {len(sessions)}")
if sessions:
    print("\n前 3 个:")
    for s in sessions[:3]:
        title = s.title or s.display_name or ""
        if len(title) > 50:
            title = title[:50] + "..."
        print(f"  - {title}")
        print(f"    ID: {s.session_id}")
        print(f"    时间: {s.created_at_str}")
