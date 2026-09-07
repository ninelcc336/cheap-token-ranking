import assert from 'node:assert/strict';
import test from 'node:test';
import { iqQuestions } from './iq-tests';

/**
 * 检测题由人工维护，会频繁增删，因此测试只做结构不变量校验，
 * 不对题目数量或具体内容做固定断言，保证维护数据时测试不会失效。
 */
test('题目 id 唯一且核心字段完整', () => {
  const ids = iqQuestions.map((question) => question.id);

  assert.equal(new Set(ids).size, ids.length);
  iqQuestions.forEach((question) => {
    assert.ok(question.title.trim(), `题目 ${question.id} 缺少标题`);
    assert.ok(question.prompt.trim(), `题目 ${question.id} 缺少题目原文`);
    assert.ok(question.answer.trim(), `题目 ${question.id} 缺少结果`);
    assert.ok(question.model.trim(), `题目 ${question.id} 缺少推荐模型`);
    assert.ok(question.effort.trim(), `题目 ${question.id} 缺少推荐强度`);
  });
});

test('引用链接必须是合法 URL 且带说明文字', () => {
  iqQuestions.forEach((question) => {
    question.references.forEach((reference) => {
      assert.ok(reference.label.trim(), `题目 ${question.id} 的引用链接缺少说明文字`);
      assert.match(reference.url, /^https?:\/\//, `题目 ${question.id} 的引用链接无效：${reference.url}`);
    });
  });
});
