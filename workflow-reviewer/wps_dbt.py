#!/usr/bin/env python3
"""
WPS 开放平台 - 多维表格操作工具

支持两套 API：
  - v1 (旧版): WPS-3 签名 + /kopen/office/file/... 路径，需 dbsheet.all 权限（用户授权）
  - v2 (新版 WPS 365): KSO-1 签名 + /v7/coop/dbsheet/... 路径，需 kso.dbsheet.readwrite 权限（应用授权）

用法:
  python wps_dbt.py --action sheets
  python wps_dbt.py --action create --fields '{"字段名":"值"}'
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import requests


def extract_file_token(url: str) -> str:
    """从 WPS 链接中提取 file_token / file_id"""
    if not url:
        return ''
    patterns = [
        r'/l/([a-zA-Z0-9]+)',
        r'file_token=([a-zA-Z0-9]+)',
        r'file_id=([a-zA-Z0-9]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return url.strip()


def get_rfc1123_date() -> str:
    """获取 RFC1123 格式的 GMT 时间"""
    return datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')


def md5_hex(data: bytes) -> str:
    """计算 MD5，返回小写 hex"""
    return hashlib.md5(data).hexdigest().lower()


def sha256_hex(data: bytes) -> str:
    """计算 SHA256，返回小写 hex"""
    return hashlib.sha256(data).hexdigest().lower()


def wps3_sign(appkey: str, content_md5: str, uri: str, content_type: str, date: str) -> str:
    """WPS-3 签名算法

    signature = sha1(APPKEY + Content-Md5 + RequestURI + Content-Type + Date)
    返回: 签名字符串
    """
    sign_str = appkey + content_md5 + uri + content_type + date
    signature = hashlib.sha1(sign_str.encode('utf-8')).hexdigest()
    return signature


def kso1_sign(secret_key: str, method: str, uri: str, content_type: str, date: str, body: bytes = None) -> str:
    """KSO-1 签名算法

    signature = HMAC-SHA256(secretKey, "KSO-1" + Method + RequestURI + ContentType + KsoDate + sha256(RequestBody))
    返回: 十六进制签名字符串
    """
    body_sha = ''
    if body and len(body) > 0:
        body_sha = sha256_hex(body)

    sign_str = f'KSO-1{method}{uri}{content_type}{date}{body_sha}'
    signature = hmac.new(
        secret_key.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest().lower()

    return signature


class WpsDbtClient:
    """WPS 开放平台多维表格客户端"""

    def __init__(
        self,
        app_id: str = '',
        app_key: str = '',
        file_id: str = '',
        url: str = '',
        api_base_url: str = 'https://openapi.wps.cn',
        scope: str = '',
        api_version: str = 'v2',
    ):
        self.app_id = app_id or os.getenv('WPS_APP_ID', '')
        self.app_key = app_key or os.getenv('WPS_APP_KEY', '')
        self.file_id = file_id or extract_file_token(url)
        self.api_base_url = api_base_url or os.getenv('WPS_API_BASE_URL', 'https://openapi.wps.cn')
        self.scope = scope if scope is not None else os.getenv('WPS_SCOPE', '')
        self.api_version = api_version or os.getenv('WPS_API_VERSION', 'v2')

        if not self.app_id or not self.app_key:
            raise ValueError('未配置 WPS_APP_ID 或 WPS_APP_KEY')
        if not self.file_id:
            raise ValueError('未指定 file_id 或 url')

        self._access_token = None
        self._access_token_expire = 0

        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        })

    # ── Access Token ────────────────────────────────────────

    def _get_access_token(self) -> str:
        """获取 access_token（带缓存）"""
        if self._access_token and self._access_token_expire > time.time() + 60:
            return self._access_token

        token_url = f'{self.api_base_url}/oauth2/token'
        payload = {
            'grant_type': 'client_credentials',
            'client_id': self.app_id,
            'client_secret': self.app_key,
        }
        if self.scope:
            payload['scope'] = self.scope

        try:
            response = requests.post(token_url, data=payload, timeout=15)
            data = response.json()
        except Exception as e:
            raise RuntimeError(f'获取 access_token 请求失败: {e}')

        if 'access_token' in data:
            self._access_token = data['access_token']
            expires_in = data.get('expires_in', 7200)
            self._access_token_expire = time.time() + expires_in
            return self._access_token
        elif data.get('code') == 0 and 'data' in data:
            token_data = data['data']
            self._access_token = token_data.get('access_token', '')
            expires_in = token_data.get('expires_in', 7200)
            self._access_token_expire = time.time() + expires_in
            return self._access_token
        else:
            raise RuntimeError(f'获取 access_token 失败: {json.dumps(data, ensure_ascii=False)}')

    # ── WPS-3 签名请求（旧版 v1） ──────────────────────────

    def _signed_request_v1(self, method: str, path: str, body: dict = None) -> dict:
        """发送带 WPS-3 签名的请求（旧版 API）

        Args:
            method: HTTP 方法
            path: 请求路径（不含 query），如 /kopen/office/file/xxx/core/execute/schema/query
            body: 请求体 dict

        Returns:
            API 响应结果 dict
        """
        access_token = self._get_access_token()

        body_bytes = b''
        if body is not None:
            body_bytes = json.dumps(body, ensure_ascii=False).encode('utf-8')

        content_md5 = md5_hex(body_bytes) if body_bytes else 'd41d8cd98f00b204e9800998ecf8427e'
        content_type = 'application/json'
        date = get_rfc1123_date()

        sep = '&' if '?' in path else '?'
        full_uri = f'{path}{sep}access_token={urllib.parse.quote(access_token)}'

        signature = wps3_sign(self.app_key, content_md5, full_uri, content_type, date)
        x_auth = f'WPS-3:{self.app_id}:{signature}'

        headers = {
            'Content-Md5': content_md5,
            'Content-Type': content_type,
            'Date': date,
            'X-Auth': x_auth,
        }

        url = f'{self.api_base_url}{full_uri}'

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, timeout=30)
            else:
                response = self.session.post(url, headers=headers, data=body_bytes, timeout=30)
        except Exception as e:
            return {
                'success': False,
                'error': f'请求异常: {e}',
            }

        try:
            result = response.json()
        except json.JSONDecodeError:
            return {
                'success': False,
                'error': f'响应解析失败: {response.status_code} - {response.text[:500]}',
                'status_code': response.status_code,
            }

        if result.get('result') == 0 or result.get('code') == 0:
            return {'success': True, 'data': result, 'raw': result}
        else:
            return {'success': False, 'error': result.get('msg', str(result)), 'raw': result}

    # ── KSO-1 签名请求（新版 WPS 365 v2） ─────────────────

    def _signed_request_v2(self, method: str, path: str, body: dict = None) -> dict:
        """发送带 KSO-1 签名的请求（新版 WPS 365 API）

        Args:
            method: HTTP 方法
            path: 请求路径，如 /v7/coop/dbsheet/xxx/schema
            body: 请求体 dict

        Returns:
            API 响应结果 dict
        """
        access_token = self._get_access_token()

        body_bytes = b''
        if body is not None:
            body_bytes = json.dumps(body, ensure_ascii=False).encode('utf-8')

        content_type = 'application/json'
        date = get_rfc1123_date()

        sign_uri = path

        signature = kso1_sign(self.app_key, method.upper(), sign_uri, content_type, date, body_bytes)
        auth_header = f'KSO-1 {self.app_id}:{signature}'

        headers = {
            'X-Kso-Date': date,
            'X-Kso-Authorization': auth_header,
            'Authorization': f'Bearer {access_token}',
            'Content-Type': content_type,
        }

        url = f'{self.api_base_url}{path}'

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, timeout=30)
            else:
                response = self.session.post(url, headers=headers, data=body_bytes, timeout=30)
        except Exception as e:
            return {
                'success': False,
                'error': f'请求异常: {e}',
            }

        try:
            result = response.json()
        except json.JSONDecodeError:
            return {
                'success': False,
                'error': f'响应解析失败: {response.status_code} - {response.text[:500]}',
                'status_code': response.status_code,
            }

        if result.get('code') == 0 or result.get('result') == 0:
            return {'success': True, 'data': result, 'raw': result}
        else:
            return {'success': False, 'error': result.get('message') or result.get('msg', str(result)), 'raw': result}

    # ── 统一请求入口 ───────────────────────────────────────

    def _signed_request(self, method: str, path: str, body: dict = None) -> dict:
        """发送签名请求（根据 api_version 选择对应版本）"""
        if self.api_version == 'v1':
            return self._signed_request_v1(method, path, body)
        else:
            return self._signed_request_v2(method, path, body)

    # ── 获取工作表列表 ─────────────────────────────────────

    def get_sheets(self) -> dict:
        """获取所有数据表（sheets）"""
        if self.api_version == 'v1':
            path = f'/kopen/office/file/{self.file_id}/core/execute/schema/query'
            result = self._signed_request('POST', path, body={})

            if result.get('success'):
                raw = result.get('raw', {})
                detail = raw.get('detail', {})
                sheets = []
                for sheet in detail.get('sheets', []):
                    sheets.append({
                        'id': sheet.get('id'),
                        'name': sheet.get('name'),
                        'primaryFieldId': sheet.get('primaryFieldId'),
                        'views': sheet.get('views', []),
                        'fields': sheet.get('fields', []),
                    })
                return {'success': True, 'data': {'sheets': sheets}, 'raw': raw}

            return result
        else:
            path = f'/v7/coop/dbsheet/{self.file_id}/schema'
            result = self._signed_request('GET', path)

            if result.get('success'):
                raw = result.get('raw', {})
                data = raw.get('data', {})
                sheets = []
                for sheet in data.get('sheets', []):
                    sheets.append({
                        'id': sheet.get('id'),
                        'name': sheet.get('name'),
                        'primaryFieldId': sheet.get('primary_field_id') or sheet.get('primaryFieldId'),
                        'views': sheet.get('views', []),
                        'fields': sheet.get('fields', []),
                    })
                return {'success': True, 'data': {'sheets': sheets}, 'raw': raw}

            return result

    def get_sheet_id_by_name(self, sheet_name: str) -> Optional[int]:
        """根据 sheet 名称获取 sheet_id"""
        print(f'[WPS] 查找工作表: {sheet_name}')
        result = self.get_sheets()
        if not result.get('success'):
            print(f'[WPS] 获取工作表列表失败: {result.get("error")}', file=sys.stderr)
            return None

        sheets = result.get('data', {}).get('sheets', [])
        print(f'[WPS] 共找到 {len(sheets)} 个工作表:')
        for s in sheets:
            print(f'  - {s.get("name")} (id: {s.get("id")})')

        for sheet in sheets:
            if sheet.get('name') == sheet_name:
                sid = sheet.get('id')
                print(f'[WPS] ✅ 找到匹配工作表: {sheet_name} -> sheet_id = {sid}')
                return int(sid) if sid is not None else None

        print(f'[WPS] ❌ 未找到工作表: {sheet_name}')
        return None

    def get_sheet_fields(self, sheet_name: str) -> list:
        """获取指定工作表的字段列表"""
        result = self.get_sheets()
        if not result.get('success'):
            return []

        sheets = result.get('data', {}).get('sheets', [])
        for sheet in sheets:
            if sheet.get('name') == sheet_name:
                return sheet.get('fields', [])

        return []

    # ── 创建记录 ───────────────────────────────────────────

    @staticmethod
    def _parse_fields(record: dict) -> dict:
        """解析记录中的 fields 字段（v2 API 返回的是 JSON 字符串）"""
        fields = record.get('fields', {})
        if isinstance(fields, str):
            try:
                return json.loads(fields)
            except (json.JSONDecodeError, TypeError):
                return {}
        return fields or {}

    def create_record(self, sheet_id: int, fields: dict, sheet_name: str = '') -> dict:
        """创建一条记录

        Args:
            sheet_id: 工作表 ID
            fields: 字段字典，如 {"字段名": "值", "字段2": "值2"}
            sheet_name: 工作表名称（用于获取字段类型，可选）

        Returns:
            API 响应结果
        """
        import json
        print(f'[WPS] 创建记录，sheet_id: {sheet_id}')
        print(f'[WPS] 写入字段: {json.dumps(fields, ensure_ascii=False)}')

        if self.api_version == 'v1':
            path = f'/kopen/office/file/{self.file_id}/core/execute/record/create'

            fields_schema = []
            if sheet_name:
                sheet_fields = self.get_sheet_fields(sheet_name)
                field_name_map = {f.get('name'): f for f in sheet_fields}
                for field_name in fields.keys():
                    if field_name in field_name_map:
                        f = field_name_map[field_name]
                        fields_schema.append({
                            'id': f.get('id'),
                            'name': f.get('name'),
                            'type': f.get('type', 'MultiLineText'),
                        })
                    else:
                        fields_schema.append({
                            'name': field_name,
                            'type': 'MultiLineText',
                        })
            else:
                for field_name in fields.keys():
                    fields_schema.append({
                        'name': field_name,
                        'type': 'MultiLineText',
                    })

            body = {
                'param': {
                    'sheetId': sheet_id,
                    'preferId': False,
                    'fieldsSchema': fields_schema,
                    'records': [{'fields': fields}],
                }
            }
            result = self._signed_request('POST', path, body=body)
            print(f'[WPS] 创建记录结果: code={result.get("raw", {}).get("code")}, msg={result.get("raw", {}).get("msg")}')
            return result
        else:
            path = f'/v7/coop/dbsheet/{self.file_id}/sheets/{sheet_id}/records/create'

            fields_json = json.dumps(fields, ensure_ascii=False)
            body = {
                'records': [
                    {'fieldsValue': fields_json}
                ]
            }
            result = self._signed_request('POST', path, body=body)
            raw = result.get('raw', {})
            print(f'[WPS] 创建记录结果: code={raw.get("code")}, msg={raw.get("msg")}')
            if raw.get('data'):
                records = raw['data'].get('records', [])
                print(f'[WPS] 返回记录数: {len(records)}')
            return result

    def append_record_by_sheet_name(self, sheet_name: str, fields: dict) -> dict:
        """根据 sheet 名称追加记录

        Args:
            sheet_name: 工作表名称
            fields: 字段字典

        Returns:
            API 响应结果
        """
        print(f'\n[WPS] ========== 开始写入 ==========')
        print(f'[WPS] 工作表名称: {sheet_name}')

        sheet_id = self.get_sheet_id_by_name(sheet_name)
        if sheet_id is None:
            print(f'[WPS] ❌ 找不到工作表，写入失败')
            return {'success': False, 'error': f'找不到工作表: {sheet_name}'}

        result = self.create_record(sheet_id, fields, sheet_name=sheet_name)

        if result.get('success'):
            print(f'[WPS] ✅ 写入成功')
        else:
            print(f'[WPS] ❌ 写入失败: {result.get("error")}')
        print(f'[WPS] ==============================\n')

        return result

    # ── 查询记录 ───────────────────────────────────────────

    def list_records(self, sheet_id: int, page_size: int = 100, page_token: str = '') -> dict:
        """获取记录列表

        Args:
            sheet_id: 工作表 ID
            page_size: 每页数量
            page_token: 分页标记

        Returns:
            API 响应结果
        """
        print(f'[WPS] 查询记录列表，sheet_id: {sheet_id}, page_size: {page_size}')

        if self.api_version == 'v1':
            path = f'/kopen/office/file/{self.file_id}/core/execute/record/list'
            body = {
                'param': {
                    'sheetId': sheet_id,
                    'pageSize': page_size,
                }
            }
            if page_token:
                body['param']['pageToken'] = page_token
            result = self._signed_request('POST', path, body=body)
        else:
            path = f'/v7/coop/dbsheet/{self.file_id}/sheets/{sheet_id}/records'
            body = {}
            if page_size:
                body['page_size'] = page_size
            if page_token:
                body['page_token'] = page_token
            result = self._signed_request('POST', path, body=body)

        raw = result.get('raw', {})
        print(f'[WPS] 查询记录结果: code={raw.get("code")}, msg={raw.get("msg")}')
        if result.get('success') and raw.get('data'):
            records = raw['data'].get('records', [])
            print(f'[WPS] 返回记录数: {len(records)}')
            total = raw['data'].get('total', len(records))
            print(f'[WPS] 总记录数: {total}')

        return result

    def list_all_records(self, sheet_id: int) -> list:
        """获取所有记录（自动分页）

        Args:
            sheet_id: 工作表 ID

        Returns:
            记录列表
        """
        all_records = []
        page_token = ''
        page_size = 100

        while True:
            result = self.list_records(sheet_id, page_size=page_size, page_token=page_token)
            if not result.get('success'):
                print(f'[WPS] 查询记录失败: {result.get("error")}')
                break

            raw = result.get('raw', {})
            data = raw.get('data', {})
            records = data.get('records', [])
            all_records.extend(records)

            page_token = data.get('page_token', '') or data.get('nextPageToken', '')
            if not page_token or len(records) < page_size:
                break

        print(f'[WPS] 共获取 {len(all_records)} 条记录')
        return all_records

    def find_records_by_field(self, sheet_id: int, field_name: str, field_value: str) -> list:
        """根据字段值查找记录

        Args:
            sheet_id: 工作表 ID
            field_name: 字段名称
            field_value: 字段值

        Returns:
            匹配的记录列表
        """
        print(f'[WPS] 按字段查找记录: {field_name} = {field_value}')

        all_records = self.list_all_records(sheet_id)
        matched = []

        for record in all_records:
            fields = self._parse_fields(record)
            value = fields.get(field_name, '')

            if isinstance(value, list):
                value_str = str(value[0]) if value else ''
            else:
                value_str = str(value)

            if value_str == str(field_value):
                matched.append(record)

        print(f'[WPS] 找到 {len(matched)} 条匹配记录')
        return matched

    # ── 更新记录 ───────────────────────────────────────────

    def update_record(self, sheet_id: int, record_id: str, fields: dict) -> dict:
        """更新记录

        Args:
            sheet_id: 工作表 ID
            record_id: 记录 ID
            fields: 要更新的字段字典

        Returns:
            API 响应结果
        """
        import json
        print(f'[WPS] 更新记录，sheet_id: {sheet_id}, record_id: {record_id}')
        print(f'[WPS] 更新字段: {json.dumps(fields, ensure_ascii=False)}')

        if self.api_version == 'v1':
            path = f'/kopen/office/file/{self.file_id}/core/execute/record/update'
            body = {
                'param': {
                    'sheetId': sheet_id,
                    'recordId': record_id,
                    'fields': fields,
                }
            }
            result = self._signed_request('POST', path, body=body)
        else:
            path = f'/v7/coop/dbsheet/{self.file_id}/sheets/{sheet_id}/records/update'
            fields_json = json.dumps(fields, ensure_ascii=False)
            body = {
                'records': [
                    {'id': record_id, 'fieldsValue': fields_json}
                ]
            }
            result = self._signed_request('POST', path, body=body)

        raw = result.get('raw', {})
        print(f'[WPS] 更新记录结果: code={raw.get("code")}, msg={raw.get("msg")}')
        return result

    def upsert_record_by_field(self, sheet_name: str, lookup_field: str, lookup_value: str, fields: dict) -> dict:
        """根据字段值更新或创建记录（upsert）

        Args:
            sheet_name: 工作表名称
            lookup_field: 用于查找的字段名
            lookup_value: 用于查找的字段值
            fields: 要写入的字段字典

        Returns:
            API 响应结果，包含 is_new 标记是新建还是更新
        """
        import json
        print(f'\n[WPS] ========== Upsert 记录 ==========')
        print(f'[WPS] 工作表名称: {sheet_name}')
        print(f'[WPS] 查找字段: {lookup_field} = {lookup_value}')
        print(f'[WPS] 写入字段: {json.dumps(fields, ensure_ascii=False)}')

        sheet_id = self.get_sheet_id_by_name(sheet_name)
        if sheet_id is None:
            print(f'[WPS] ❌ 找不到工作表')
            return {'success': False, 'error': f'找不到工作表: {sheet_name}'}

        matched_records = self.find_records_by_field(sheet_id, lookup_field, lookup_value)

        if matched_records:
            record_id = matched_records[0].get('record_id') or matched_records[0].get('id')
            print(f'[WPS] 找到匹配记录，record_id: {record_id}，执行更新')

            result = self.update_record(sheet_id, record_id, fields)
            result['is_new'] = False
            result['record_id'] = record_id

            if result.get('success'):
                print(f'[WPS] ✅ 更新成功')
            else:
                print(f'[WPS] ❌ 更新失败: {result.get("error")}')
        else:
            print(f'[WPS] 未找到匹配记录，执行创建')

            full_fields = {lookup_field: lookup_value, **fields}
            result = self.create_record(sheet_id, full_fields, sheet_name=sheet_name)
            result['is_new'] = True

            if result.get('success'):
                raw = result.get('raw', {})
                data = raw.get('data', {})
                records = data.get('records', [])
                if records:
                    result['record_id'] = records[0].get('record_id') or records[0].get('id')
                print(f'[WPS] ✅ 创建成功')
            else:
                print(f'[WPS] ❌ 创建失败: {result.get("error")}')

        print(f'[WPS] ==============================\n')
        return result


def main():
    parser = argparse.ArgumentParser(
        description='WPS 开放平台 - 多维表格操作工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 获取工作表列表（新版API）
  python wps_dbt.py --file-id ct9Ka3fktD75 --action sheets

  # 创建记录（新版API）
  python wps_dbt.py --file-id ct9Ka3fktD75 --sheet-name "表格视图" --action create --fields '{"字段名":"值"}'

  # 使用旧版 API
  python wps_dbt.py --api-version v1 --scope dbsheet.all --file-id ct9Ka3fktD75 --action sheets

  # 从文档链接提取 file_id
  python wps_dbt.py --url "https://www.kdocs.cn/l/ct9Ka3fktD75?R=L1MvNw==" --action sheets
        """
    )
    parser.add_argument('--app-id', help='应用 ID（默认读取环境变量 WPS_APP_ID）')
    parser.add_argument('--app-key', help='应用密钥（默认读取环境变量 WPS_APP_KEY）')
    parser.add_argument('--file-id', help='文件 ID')
    parser.add_argument('--url', help='文档链接（自动提取 file_id）')
    parser.add_argument('--api-base-url', help='API 基础地址（默认：https://openapi.wps.cn）')
    parser.add_argument('--scope', help='权限范围（自建应用可留空）')
    parser.add_argument('--api-version', default='v2', choices=['v1', 'v2'], help='API 版本（默认：v2 新版 WPS 365）')
    parser.add_argument('--sheet-name', default='表格视图', help='工作表名称（默认：表格视图）')
    parser.add_argument('--action', default='create', choices=['sheets', 'create'], help='操作类型')
    parser.add_argument('--fields', help='字段 JSON（创建时使用）')

    args = parser.parse_args()

    if not args.file_id and not args.url:
        print('错误：必须提供 --file-id 或 --url', file=sys.stderr)
        sys.exit(1)

    try:
        client = WpsDbtClient(
            app_id=args.app_id,
            app_key=args.app_key,
            file_id=args.file_id,
            url=args.url,
            api_base_url=args.api_base_url,
            scope=args.scope,
            api_version=args.api_version,
        )
    except ValueError as e:
        print(f'错误：{e}', file=sys.stderr)
        sys.exit(1)

    if args.action == 'sheets':
        result = client.get_sheets()
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.action == 'create':
        if not args.fields:
            print('错误：创建记录必须提供 --fields', file=sys.stderr)
            sys.exit(1)
        try:
            fields = json.loads(args.fields)
        except json.JSONDecodeError as e:
            print(f'错误：fields JSON 解析失败: {e}', file=sys.stderr)
            sys.exit(1)

        result = client.append_record_by_sheet_name(args.sheet_name, fields)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
