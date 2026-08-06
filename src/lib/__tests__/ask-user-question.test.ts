import { describe, expect, it } from 'vitest';
import { buildAskUserQuestionAnswers } from '../ask-user-question';

describe('AskUserQuestion answer payload', () => {
  const questions = [
    { question: 'Which mode should be used?', options: [{ label: 'Fast' }, { label: 'Safe' }] },
    { question: 'Which checks should run?', options: [{ label: 'Unit' }, { label: 'UI' }] },
  ];

  it('keys answers by exact question text', () => {
    expect(buildAskUserQuestionAnswers(
      questions,
      { 0: new Set([1]), 1: new Set([0, 1]) },
      {},
      {},
    )).toEqual({
      'Which mode should be used?': 'Safe',
      'Which checks should run?': 'Unit, UI',
    });
  });

  it('uses free-form text for the matching question', () => {
    expect(buildAskUserQuestionAnswers(
      questions,
      { 0: new Set([0]) },
      { 0: 'Custom mode' },
      { 0: true },
    )).toEqual({ 'Which mode should be used?': 'Custom mode' });
  });
});
