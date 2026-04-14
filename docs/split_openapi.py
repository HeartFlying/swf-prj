#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenAPI 接口拆分脚本
将单个 OpenAPI 文件拆分为多个独立的接口文件，并生成索引 Markdown
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Set


def load_openapi_file(file_path: str) -> Dict[str, Any]:
    """加载 OpenAPI JSON 文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_schema_refs(obj: Any) -> Set[str]:
    """
    从对象中提取所有 $ref 引用的 schema 名称
    例如：#/components/schemas/LoginRequest -> LoginRequest
    """
    refs = set()
    
    if isinstance(obj, dict):
        if '$ref' in obj:
            ref = obj['$ref']
            # 匹配 #/components/schemas/SchemaName
            match = re.match(r'#/components/schemas/(.+)', ref)
            if match:
                refs.add(match.group(1))
        else:
            for value in obj.values():
                refs.update(extract_schema_refs(value))
    elif isinstance(obj, list):
        for item in obj:
            refs.update(extract_schema_refs(item))
    
    return refs


def collect_dependencies(schema_name: str, schemas: Dict[str, Any], collected: Set[str] = None) -> Set[str]:
    """
    递归收集 schema 的所有依赖项
    """
    if collected is None:
        collected = set()
    
    if schema_name in collected or schema_name not in schemas:
        return collected
    
    collected.add(schema_name)
    
    # 获取该 schema 的定义
    schema_def = schemas[schema_name]
    
    # 提取该 schema 引用的其他 schema
    direct_refs = extract_schema_refs(schema_def)
    
    # 递归收集依赖
    for ref in direct_refs:
        collect_dependencies(ref, schemas, collected)
    
    return collected


def get_used_schemas(operation: Dict[str, Any], all_schemas: Dict[str, Any]) -> Dict[str, Any]:
    """
    分析接口操作，获取其实际使用的所有 schema（包括依赖项）
    """
    # 提取接口直接引用的 schema
    used_refs = extract_schema_refs(operation)
    
    # 收集所有依赖的 schema
    all_used_refs = set()
    for ref in used_refs:
        all_used_refs.update(collect_dependencies(ref, all_schemas))
    
    # 构建只包含使用到的 schema 的 components
    used_schemas = {ref: all_schemas[ref] for ref in all_used_refs if ref in all_schemas}
    
    return used_schemas


def normalize_path(path: str) -> str:
    """
    规范化路径为文件名
    例如：/api/v1/auth/login -> api_v1_auth_login
    """
    # 移除前后的斜杠，并用下划线替换中间的斜杠
    normalized = path.strip('/')
    normalized = normalized.replace('/', '_')
    return normalized


def generate_filename(method: str, path: str) -> str:
    """
    生成接口文件名
    格式：{method}_{normalized_path}.json
    例如：post_api_v1_auth_login.json
    """
    normalized = normalize_path(path)
    return f"{method.lower()}_{normalized}.json"


def split_openapi(openapi_data: Dict[str, Any], output_dir: str) -> List[Dict[str, Any]]:
    """
    拆分 OpenAPI 文件为多个接口文件
    返回接口元数据列表用于生成索引
    """
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    paths = openapi_data.get('paths', {})
    all_components = openapi_data.get('components', {})
    all_schemas = all_components.get('schemas', {}) if all_components else {}
    openapi_version = openapi_data.get('openapi', '3.1.0')
    info = openapi_data.get('info', {})
    
    # 存储接口元数据
    api_metadata = []
    
    # 遍历所有路径
    for path, path_item in paths.items():
        # 遍历所有 HTTP 方法
        for method, operation in path_item.items():
            if method.lower() in ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']:
                # 生成文件名
                filename = generate_filename(method, path)
                file_path = os.path.join(output_dir, filename)
                
                # 创建独立的接口对象
                api_spec = {
                    'openapi': openapi_version,
                    'info': info,
                    'paths': {
                        path: {
                            method: operation
                        }
                    }
                }
                
                # 只添加该接口实际使用的 schema
                if all_schemas:
                    used_schemas = get_used_schemas(operation, all_schemas)
                    if used_schemas:
                        # 保留 securitySchemes 等其他 components（如果有）
                        api_components = {'schemas': used_schemas}
                        # 复制其他 components（如 securitySchemes）
                        for key, value in all_components.items():
                            if key != 'schemas':
                                api_components[key] = value
                        api_spec['components'] = api_components
                
                # 写入文件
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(api_spec, f, indent=2, ensure_ascii=False)
                
                # 收集元数据
                tags = operation.get('tags', ['default'])
                summary = operation.get('summary', 'No summary')
                description = operation.get('description', '')
                schema_count = len(used_schemas) if all_schemas else 0
                
                api_metadata.append({
                    'filename': filename,
                    'method': method.upper(),
                    'path': path,
                    'tags': tags,
                    'summary': summary,
                    'description': description,
                    'schema_count': schema_count
                })
                
                print(f"✓ 生成：{filename} (包含 {schema_count} 个 schema)")
    
    return api_metadata


def generate_readme(api_metadata: List[Dict[str, Any]], output_dir: str, title: str = "API 文档") -> str:
    """
    生成索引 Markdown 文件
    """
    # 按 Tag 分组
    tags_dict: Dict[str, List[Dict[str, Any]]] = {}
    for api in api_metadata:
        for tag in api['tags']:
            if tag not in tags_dict:
                tags_dict[tag] = []
            tags_dict[tag].append(api)
    
    # 生成 Markdown 内容
    md_lines = [
        f"# {title}",
        "",
        "本目录包含所有 API 接口的独立定义文件。每个接口都有一个对应的 JSON 文件。",
        "",
        "## 目录",
        ""
    ]
    
    # 按 Tag 分组列出所有接口
    for tag in sorted(tags_dict.keys()):
        apis = tags_dict[tag]
        md_lines.append(f"### {tag}")
        md_lines.append("")
        md_lines.append("| 方法 | 路径 | 描述 | 文件 |")
        md_lines.append("|------|------|------|------|")
        
        for api in sorted(apis, key=lambda x: x['path']):
            method = api['method']
            path = api['path']
            summary = api['summary'][:50] + "..." if len(api['summary']) > 50 else api['summary']
            filename = api['filename']
            
            # 创建 Markdown 链接
            link = f"[{filename}]({filename})"
            
            md_lines.append(f"| `{method}` | `{path}` | {summary} | {link} |")
        
        md_lines.append("")
    
    # 添加统计信息
    md_lines.append("## 统计信息")
    md_lines.append("")
    md_lines.append(f"- **总接口数**: {len(api_metadata)}")
    md_lines.append(f"- **Tag 分类数**: {len(tags_dict)}")
    md_lines.append(f"- **分类**: {', '.join(sorted(tags_dict.keys()))}")
    md_lines.append("")
    
    # 写入 README.md 文件
    readme_path = os.path.join(output_dir, "README.md")
    readme_content = "\n".join(md_lines)
    
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"✓ 生成索引文件：README.md")
    
    return readme_content


def main():
    """主函数"""
    # 配置路径
    base_dir = Path(__file__).parent
    openapi_file = base_dir / "openapi.json"
    output_dir = base_dir / "apis"
    
    print("=" * 60)
    print("OpenAPI 接口拆分工具")
    print("=" * 60)
    print()
    
    # 检查输入文件
    if not openapi_file.exists():
        print(f"❌ 错误：找不到文件 {openapi_file}")
        return
    
    # 加载 OpenAPI 文件
    print(f"📖 加载文件：{openapi_file}")
    openapi_data = load_openapi_file(str(openapi_file))
    print(f"✓ OpenAPI 版本：{openapi_data.get('openapi', 'unknown')}")
    print(f"✓ 标题：{openapi_data.get('info', {}).get('title', 'unknown')}")
    print()
    
    # 拆分接口
    print("🔪 开始拆分接口...")
    print("-" * 60)
    api_metadata = split_openapi(openapi_data, str(output_dir))
    print("-" * 60)
    print()
    
    # 生成索引
    print("📝 生成索引文件...")
    print("-" * 60)
    title = openapi_data.get('info', {}).get('title', 'API Documentation')
    readme_content = generate_readme(api_metadata, str(output_dir), title)
    print("-" * 60)
    print()
    
    # 总结
    print("=" * 60)
    print("✅ 完成!")
    print("=" * 60)
    print(f"📊 生成接口文件数：{len(api_metadata)}")
    print(f"📁 输出目录：{output_dir}")
    print(f"📄 索引文件：{output_dir / 'README.md'}")
    print()


if __name__ == "__main__":
    main()
