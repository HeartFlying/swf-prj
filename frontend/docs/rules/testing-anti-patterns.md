# 测试反模式规则

本文档定义了测试开发中需要避免的反模式。

## 1. 测试与实现耦合

**反模式**: 测试代码过度依赖实现细节，导致重构时测试频繁失败。

**正确做法**: 测试应该验证行为而不是实现。

```python
# 错误
assert user._password_hash == "abc123"

# 正确
assert user.check_password("correct_password")
```

## 2. 测试间相互依赖

**反模式**: 测试用例之间存在执行顺序依赖。

**正确做法**: 每个测试应该是独立的，可以单独运行。

## 3. 过度使用 Mock

**反模式**: Mock 了所有外部依赖，导致测试失去实际意义。

**正确做法**: 集成测试中应尽量减少 Mock，使用真实依赖或测试替身。

## 4. 忽略边界条件

**反模式**: 只测试正常路径，忽略边界条件和异常情况。

**正确做法**: 必须测试边界值、空值、异常输入等。

## 5. 测试数据硬编码

**反模式**: 测试数据直接硬编码在测试代码中。

**正确做法**: 使用工厂模式或 fixtures 生成测试数据。

## 6. 缺乏断言

**反模式**: 测试代码执行了操作但没有验证结果。

**正确做法**: 每个测试必须有明确的断言验证预期结果。

## 7. 集成测试不使用真实数据库

**反模式**: 集成测试使用 Mock 数据库或内存数据库，无法发现真实环境问题。

**正确做法**: 
- 集成测试应该使用与生产环境相同的数据库
- 使用事务回滚确保测试隔离性
- 测试完成后清理测试数据
- 验证数据库状态变化

```python
# 错误 - 使用 Mock
@pytest.mark.asyncio
async def test_create_user(mock_db):
    mock_db.add.return_value = None
    result = await create_user(user_data)
    assert result is not None

# 正确 - 使用真实数据库事务
@pytest.mark.asyncio
async def test_create_user(db_session):
    async with db_session.begin():
        result = await create_user(db_session, user_data)
        assert result.id is not None
        # 验证数据库中确实存在
        db_user = await db_session.get(User, result.id)
        assert db_user is not None
```

## 8. 不清理测试数据

**反模式**: 测试后留下脏数据，影响后续测试。

**正确做法**: 使用 fixtures 自动清理，或确保每个测试清理自己的数据。

## 9. 测试命名不清晰

**反模式**: 测试函数名无法说明测试目的。

**正确做法**: 使用描述性命名，如 `test_should_return_401_when_credentials_invalid`。

## 10. 重复代码

**反模式**: 多个测试中重复相同的设置代码。

**正确做法**: 使用 fixtures 和辅助函数提取公共代码。
