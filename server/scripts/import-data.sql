SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;
TRUNCATE TABLE session_events;
TRUNCATE TABLE file_changes;
TRUNCATE TABLE tool_uses;
TRUNCATE TABLE subagents;
TRUNCATE TABLE turns;
TRUNCATE TABLE sessions;
TRUNCATE TABLE members;
SET FOREIGN_KEY_CHECKS=1;
INSERT INTO members (id, git_email, created_at, updated_at) VALUES (1, 'thirai@classlab.co.jp', NOW(), NOW());
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      1, 1, '61845c35-0c82-42f7-8196-da93e0ade47b', 'claude-opus-4-6',
      'unknown', 'main',
      NULL,
      '2026-02-15 10:05:24', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      2, 1, 'b010bfe0-96c1-43a9-8b32-60ff7f8ebb97', 'claude-opus-4-6',
      'unknown', 'main',
      NULL,
      '2026-02-15 10:05:07', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      3, 1, 'f34516ad-8fed-47c9-9391-f91e31fb163d', 'unknown',
      'unknown', 'main',
      NULL,
      '2026-02-15 10:04:15', '2026-02-15 10:04:17', 'other',
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      4, 1, '56d28160-7948-4fc2-a80d-6cd1a1826cda', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'v2',
      NULL,
      '2026-02-15 02:43:47', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      5, 1, '8d62c924-eeb2-42e0-8b6e-3dbd0cbf4506', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'v2',
      NULL,
      '2026-02-15 02:39:15', '2026-02-15 02:43:37', 'other',
      40, 3033,
      129544, 945024,
      4.0746, 19, 18,
      0, 5,
      'グルーバルのhooksが壊れています\\ ⏺ Ran 1 stop hook   ⎿  Stop hook error: Failed with non-blocking status code: Error occurred while executing hook command: ENOENT: no such file or directory, posix_spawn \'/bin/sh\'', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        1, 5, 1,
        'グルーバルのhooksが壊れています\\ ⏺ Ran 1 stop hook   ⎿  Stop hook error: Failed with non-blocking status code: Error occurred while executing hook command: ENOENT: no such file or directory, posix_spawn \'/bin/sh\'', '2026-02-15 02:39:37',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        2, 5, 2,
        '直してください。', '2026-02-15 02:41:32',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      6, 1, 'b5c7530b-82c2-47d8-9a8f-c5bb3ab709c2', 'unknown',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 18:55:38', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      7, 1, '2bd6444c-2895-477b-b4ae-ed91a888016d', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'v2',
      NULL,
      '2026-02-14 18:43:35', '2026-02-14 18:55:37', 'clear',
      7474, 37538,
      2203272, 39864549,
      104.0356, 234, 211,
      11, 23,
      'セッションの詳細ページは無くなったのですか?\\ ui-ux-pro-max', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        3, 7, 1,
        'docs/analytics-expansion-plan.md docs/mock-enhanced-dashboard.html\\ の内容をNextJsとHooks(必要であれば)の更新を行います\\ planして実装してください\\ ui-ux-pro-maxと\\ claude-codeスキルを利用してください\\ サブエージェントを利用してください。', '2026-02-14 18:45:16',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          1, 7, 3, '2bd6444c-2895-477b-b4ae-ed91a888016d-t1-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 66,
          121, 36,
          112906, 543176,
          0.1566, 16,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 1,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          2, 7, 3, '2bd6444c-2895-477b-b4ae-ed91a888016d-t1-s1',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 70,
          234, 100,
          186980, 1708328,
          0.3242, 24,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Glob', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 2,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          3, 7, 3, '2bd6444c-2895-477b-b4ae-ed91a888016d-t1-s2',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 35,
          98, 32,
          77334, 458933,
          0.1143, 12,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 3, 3,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        4, 7, 2,
        'server/views', '2026-02-14 18:49:22',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          4, 7, 4, '2bd6444c-2895-477b-b4ae-ed91a888016d-t2-s0',
          'Plan', 'claude-opus-4-6',
          NULL, 226,
          49, 303,
          421567, 1957763,
          10.8645, 31,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 4, 4,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        5, 7, 3,
        'ブロックされているか確認してください。', '2026-02-15 02:44:08',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        6, 7, 4,
        'ドッカー統合して、起動してください', '2026-02-15 02:49:42',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        7, 7, 5,
        'UIが崩れまっくてマス\\ Localhost3001', '2026-02-15 02:59:02',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          5, 7, 7, '2bd6444c-2895-477b-b4ae-ed91a888016d-t5-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 40,
          37, 8,
          45578, 174502,
          0.0596, 4,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 7, 5,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 7, 5,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 7, 5,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 7, 5,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        8, 7, 6,
        'リポジトリのグラフのヒートマップなどがなくなっています\\ 忠実に実行してください\\ 日本語にしてください。', '2026-02-15 03:07:16',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          6, 7, 8, '2bd6444c-2895-477b-b4ae-ed91a888016d-t6-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 60,
          47791, 63,
          169186, 2057843,
          0.3723, 25,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 6,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          7, 7, 8, '2bd6444c-2895-477b-b4ae-ed91a888016d-t6-s1',
          'general-purpose', 'claude-opus-4-6',
          NULL, 128,
          9815, 154,
          197356, 1344145,
          5.8754, 26,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 7,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          8, 7, 8, '2bd6444c-2895-477b-b4ae-ed91a888016d-t6-s2',
          'general-purpose', 'claude-opus-4-6',
          NULL, 254,
          6184, 527,
          129201, 3846915,
          8.3252, 54,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 8,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          9, 7, 8, '2bd6444c-2895-477b-b4ae-ed91a888016d-t6-s3',
          'general-purpose', 'claude-opus-4-6',
          NULL, 321,
          111, 578,
          252050, 5760271,
          13.4114, 72,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskCreate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 9,
            'TaskUpdate', 'other',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          10, 7, 8, '2bd6444c-2895-477b-b4ae-ed91a888016d-t6-s4',
          'general-purpose', 'claude-opus-4-6',
          NULL, 276,
          114, 308,
          214539, 5578120,
          12.4146, 63,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Write', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 8, 10,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        9, 7, 7,
        'グラフとグラフの間の余白がおかしくなっています\\ ui-ux-pro-max', '2026-02-15 03:19:39',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        10, 7, 8,
        'セッションの詳細ページは無くなったのですか?\\ ui-ux-pro-max', '2026-02-15 03:25:50',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          11, 7, 10, '2bd6444c-2895-477b-b4ae-ed91a888016d-t8-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 35,
          62, 42,
          121595, 625472,
          0.1719, 11,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 10, 11,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        11, 7, 9,
        'グローバルフックの送信先をLocalにしてください！\\ pleskのDB情報もlocalにインポートしてください\\ rootのパスワードはtakuma48 です', '2026-02-15 10:04:52',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          12, 7, 11, '2bd6444c-2895-477b-b4ae-ed91a888016d-t9-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 29,
          1688, 23,
          70540, 287465,
          0.095, 10,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Bash', 'bash',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Glob', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            7, 11, 12,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":177181}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":177181}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":528149}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":177181}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":528149}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":335140}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":177181}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":528149}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":335140}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":539645}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":81360}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":134772}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":47587}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":177181}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":528149}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":335140}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":539645}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":190881}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        7, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      8, 1, '64051d2c-022a-49b3-8245-a013c139c121', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 18:32:47', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      9, 1, '54cd920c-86a3-4428-908b-04de6ead58cf', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 17:35:16', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      10, 1, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9', 'claude-opus-4-6',
      'thirai-classlab/github-markdown-extended-features', 'main',
      NULL,
      '2026-02-14 17:12:52', NULL, NULL,
      112, 2975,
      481893, 2236621,
      12.6152, 32, 23,
      7, 0,
      'ガイドはどこにありますか?\\ ファイルが存在しません。', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        12, 10, 1,
        'https://code.claude.com/docs/ja/*\\   のURLの内容をすべて網羅的に分析してClaudeコードの完全ガイド、おすすめ機能\\ 重要な本質など情報を整理してください。\\ やりたいことできることやらないといけないこと\\ ユースケースごとなど\\ ULTRATHINK', '2026-02-14 17:14:26',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          13, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s0',
          'general-purpose', 'claude-opus-4-6',
          NULL, 155,
          16, 11,
          100973, 15659,
          1.9178, 4,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 13,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 13,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 13,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 13,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          14, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s1',
          'general-purpose', 'claude-opus-4-6',
          NULL, 194,
          5830, 31,
          90221, 378087,
          2.3485, 9,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 14,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          15, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s2',
          'general-purpose', 'claude-opus-4-6',
          NULL, 112,
          19, 13,
          47392, 106261,
          1.0493, 5,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 15,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 15,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 15,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 15,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 15,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          16, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s3',
          'general-purpose', 'claude-opus-4-6',
          NULL, 128,
          22, 15,
          65387, 121381,
          1.4095, 6,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 16,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          17, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s4',
          'general-purpose', 'claude-opus-4-6',
          NULL, 177,
          25, 17,
          51106, 136507,
          1.1646, 7,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 17,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          18, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s5',
          'general-purpose', 'claude-opus-4-6',
          NULL, 206,
          22, 15,
          29213, 121393,
          0.7313, 6,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 18,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          19, 10, 12, 'b5ffeede-d194-49c4-bdd9-367d9bc6d2a9-t1-s6',
          'general-purpose', 'claude-opus-4-6',
          NULL, 156,
          25, 17,
          45402, 136518,
          1.0577, 7,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            10, 12, 19,
            'WebFetch', 'web',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        13, 10, 2,
        '<task-notification> <task-id>aea442b</task-id> <status>completed</status> <summary>Agent "Fetch settings & config docs" completed</summary> <result>Here is a comprehensive summary of each page:  ---  ## 1. Claude Code Settings (https://code.claude.com/docs/ja/settings)  ### Configuration Scopes  Claude Code uses a hierarchical scope system to determine where settings apply:  | Scope | Location | Affects | Shared? | |-------|----------|---------|---------| | **Managed** | System-level `managed-se', '2026-02-14 17:19:13',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        14, 10, 3,
        '<task-notification> <task-id>a1872d7</task-id> <status>completed</status> <summary>Agent "Fetch extensions & integrations" completed</summary> <result>Here is a comprehensive summary of each page:  ---  ## 1. MCP (Model Context Protocol) - MCPを使用してClaude Codeをツールに接続する  **URL:** https://code.claude.com/docs/ja/mcp  ### Key Concepts  MCP (Model Context Protocol) is an open-source standard for AI-tool integration. It allows Claude Code to connect to hundreds of external tools and data sources. MCP ', '2026-02-14 17:19:21',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        15, 10, 4,
        '<task-notification> <task-id>a0416d3</task-id> <status>completed</status> <summary>Agent "Fetch quickstart & setup docs" completed</summary> <result>Here is a comprehensive summary of each page.  ---  ## 1. Quickstart Guide (https://code.claude.com/docs/ja/quickstart)  ### Overview This guide walks users through getting started with Claude Code in a few minutes, covering installation through common workflows.  ### Prerequisites - A terminal or command prompt open - A code project to work with - ', '2026-02-14 17:19:31',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        16, 10, 5,
        '<task-notification> <task-id>a6b4eaa</task-id> <status>completed</status> <summary>Agent "Fetch advanced features docs" completed</summary> <result>Below is a comprehensive summary of each page.  ---  ## 1. Headless / Programmatic Mode (Claude Code をプログラムで実行する)  **URL**: https://code.claude.com/docs/ja/headless  ### Overview  Agent SDK を使用して、CLI、Python、または TypeScript から Claude Code をプログラム的に実行する方法を説明するページ。Agent SDK は Claude Code と同じツール、エージェントループ、コンテキスト管理を提供する。CLI、Python パッケージ、TypeScript パッケージとして利', '2026-02-14 17:20:38',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        17, 10, 6,
        '<task-notification> <task-id>ac07acf</task-id> <status>completed</status> <summary>Agent "Fetch IDE & platform integrations" completed</summary> <result>Below is a comprehensive summary of each page.  ---  ## 1. VS Code Integration (`/docs/ja/vs-code`)  ### Overview The VS Code extension provides a native graphical interface for Claude Code, directly integrated into the IDE. It is the recommended way to use Claude Code within VS Code.  ### Prerequisites - VS Code 1.98.0 or higher - Anthropic acc', '2026-02-14 17:20:51',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        18, 10, 7,
        '<task-notification> <task-id>a4684cc</task-id> <status>completed</status> <summary>Agent "Fetch best practices & workflows" completed</summary> <result>Here is a comprehensive summary of all four pages.  ---  ## 1. Best Practices (https://code.claude.com/docs/ja/best-practices)  ### Overview  Claude Code is an agentic coding environment. Unlike a chatbot, it reads files, executes commands, makes changes, and solves problems autonomously. The page explains proven patterns from Anthropic\'s interna', '2026-02-14 17:20:58',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        19, 10, 8,
        '<task-notification> <task-id>a79eb1c</task-id> <status>completed</status> <summary>Agent "Fetch security & enterprise docs" completed</summary> <result>Below is a comprehensive summary of each page.  ---  ## 1. Security (セキュリティ)  **URL:** `https://code.claude.com/docs/ja/security`  ### Headings and Structure  - セキュリティへのアプローチ方法   - セキュリティの基盤   - パーミッションベースのアーキテクチャ   - 組み込み保護機能   - ユーザーの責任 - プロンプトインジェクションから保護する   - コア保護機能   - プライバシーセーフガード   - 追加のセーフガード - MCPセキュリティ - IDEセキュリティ - クラウド実行セキュリティ - セキュリ', '2026-02-14 17:21:06',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        20, 10, 9,
        'ガイドはどこにありますか?\\ ファイルが存在しません。', '2026-02-14 17:22:14',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":65800}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":65800}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":65800}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":65800}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":65800}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        10, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":285607}', NULL, NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      11, 1, '95506840-197b-4953-96c0-c5d8764fff2c', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 16:59:02', '2026-02-14 18:43:34', 'clear',
      707, 68169,
      1490890, 30167727,
      78.3291, 189, 176,
      1, 1,
      'docs/analytics-expansion-plan.md\\ を整えてください', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        21, 11, 1,
        '現在のページ構成をどう変えるべきかも考えてください\\ デベロッパーエクスペリエンスを最大化しましょう。', '2026-02-14 17:06:42',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        22, 11, 2,
        '画面をマネージャーとメンバーで分ける必要はありません。', '2026-02-14 17:16:21',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        23, 11, 3,
        'ui-ux-pro-maxを利用してまずはモックのHTMLを作成してください。', '2026-02-14 17:36:04',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        24, 11, 4,
        '現在の仕様についての修正依頼も出します\\ 所要時間はセッションが終わるまでの時間ではなく、各ターンのプロンプト送信~そのターンのレスポンスの合計にしてください\\ サブエージェントのトークン利用数合計はセッションのトップに記載してください ターンのトークン合計,サブエージェントのトークン合計\\ 総計の形式に変更してください。\\\\', '2026-02-14 17:57:06',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        25, 11, 5,
        'Cost Analysis\\ など金額は不要ですトークン数,モデルだけ分析できれば良いです。', '2026-02-14 18:09:07',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          20, 11, 25, '95506840-197b-4953-96c0-c5d8764fff2c-t5-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 25,
          16, 4,
          89246, 20492,
          0.0909, 2,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            11, 25, 20,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            11, 25, 20,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        26, 11, 6,
        't中断されました', '2026-02-14 18:33:22',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        27, 11, 7,
        'docs/analytics-expansion-plan.md\\ を整えてください', '2026-02-14 18:38:29',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":299426}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":248646}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":299426}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":248646}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":1033073}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":299426}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":248646}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":1033073}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":279747}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":299426}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":248646}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":1033073}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":279747}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":189449}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":206658}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        11, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":299426}', NULL, NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      12, 1, 'a19661d4-6a58-4515-81a3-e943f59e674b', 'claude-opus-4-6',
      'thirai-classlab/github-markdown-extended-features', 'main',
      NULL,
      '2026-02-14 16:56:13', NULL, NULL,
      61, 2853,
      272145, 1568195,
      7.6699, 14, 10,
      2, 0,
      'ページトップに目次とユースケースごとのナビゲーションを追加してください', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        28, 12, 1,
        'git hubに関連する機能Actionsやさらにその中でどのような機能があるのかおすすめはなど\\ 全てを網羅してください\\ また、拡張機能、連携システムなども網羅して調べてください\\ それをレポートとしてMDファイルを作成してください\\ README.md\\ の内容で適切な記載手法を利用してください。', '2026-02-14 16:58:01',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          21, 12, 28, 'a19661d4-6a58-4515-81a3-e943f59e674b-t1-s0',
          'general-purpose', 'claude-opus-4-6',
          NULL, 187,
          23479, 81,
          140741, 240649,
          3.3581, 15,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 21,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          22, 12, 28, 'a19661d4-6a58-4515-81a3-e943f59e674b-t1-s1',
          'general-purpose', 'claude-opus-4-6',
          NULL, 216,
          16469, 393,
          82344, 588098,
          2.7026, 24,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            12, 28, 22,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        29, 12, 2,
        '<task-notification> <task-id>a24cd5c</task-id> <status>completed</status> <summary>Agent "Research GitHub Actions features" completed</summary> <result>Now I have comprehensive information. Here is the thorough, organized research.  ---  # Comprehensive Guide to GitHub Actions Features and Capabilities (2025-2026)  ---  ## 1. Core Features  ### 1.1 Workflows  A **workflow** is a configurable automated process defined as a YAML file in the `.github/workflows/` directory of a repository. Key chara', '2026-02-14 17:07:02',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        30, 12, 3,
        '<task-notification> <task-id>a1f4232</task-id> <status>completed</status> <summary>Agent "Research GitHub platform features" completed</summary> <result>Now I have comprehensive information. Let me compile this into a thorough, organized overview.  ---  # Comprehensive Overview of GitHub Platform Features and Services (2025-2026)  ## 1. Core Features  ### Repositories The fundamental unit of GitHub. Repositories contain all project files and their complete revision history. Features include bran', '2026-02-14 17:07:09',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        31, 12, 4,
        'ページトップに目次とユースケースごとのナビゲーションを追加してください', '2026-02-14 17:13:19',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        12, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":539421}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        12, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":539421}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        12, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":539421}', NULL, NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      13, 1, 'd24ac656-35f3-485a-9f1f-b46ee9d7351a', 'claude-opus-4-6',
      'thirai-classlab/github-markdown-extended-features', 'main',
      NULL,
      '2026-02-14 16:47:22', '2026-02-14 16:49:36', 'other',
      82, 526,
      125889, 445981,
      3.0701, 9, 8,
      0, 0,
      'パンクズなどを削除して\\ git初期化してパブリックリポジトリとしてプッシュ', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        32, 13, 1,
        'パンクズなどを削除して\\ git初期化してパブリックリポジトリとしてプッシュ', '2026-02-14 16:47:56',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      14, 1, 'ea1cc3db-0bf6-4978-a718-0760a50de855', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 16:26:27', '2026-02-14 17:33:32', 'prompt_input_exit',
      15, 8959,
      48865, 182397,
      1.862, 3, 2,
      1, 0,
      'git hubのMDで表示できるMD以外の内容(mermaidなど)を網羅して調べてください\\ また、その全てを網羅したMDを作成してください。', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        33, 14, 1,
        'git hubのMDで表示できるMD以外の内容(mermaidなど)を網羅して調べてください\\ また、その全てを網羅したMDを作成してください。', '2026-02-14 16:28:02',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          23, 14, 33, 'ea1cc3db-0bf6-4978-a718-0760a50de855-t1-s0',
          'general-purpose', 'claude-sonnet-4-5-20250929',
          NULL, 178,
          7858, 455,
          133415, 518878,
          0.6864, 21,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            14, 33, 23,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      15, 1, '0767635f-50e2-4d30-a821-14c2e0994e7f', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 16:15:21', NULL, NULL,
      5177, 12761,
      163326, 1110349,
      5.7626, 19, 16,
      0, 0,
      'Readmeにも追加してください。\\ 資料を作成した場合は必ずReadmeの関連資料を更新することとしてください\\ Claude.mdに記載してください\\ また、資料のテンプレート,も記載してください\\ 目次,チャートはmermaidなど', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        34, 15, 1,
        'ultrathink\\ websearch\\ 企画書を作成\\ AI駆動開発における生産性のKPIとは何があるか\\ ストーリーポイントやアウトカム等以外で\\ AIをどれぐらい上手く使えているかの指標を例えばセッションあたりのターン数やターン内のToken数や動作時間などどのような数字状態であれば、上手く利用できているかを検索も含めて考えてください\\ レポートをMD+mermaidで作成してください。', '2026-02-14 16:20:27',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        35, 15, 2,
        'が見にくすぎるのでよこの組織図にしてください。\\ AI活用度KPI体系  Tier 1 セッション効率指標  Tier 2 AI活用品質指標  Tier 3 自律性・成熟度指標  Tier 4 コスト効率指標  ターン数 / セッション  トークン数 / ターン  セッション所要時間  ツールコール数 / ターン  初回成功率  コードチャーン率  手戻り介入率  提案採択率  自律動作比率  エスカレーション頻度  自己修正率  コンテキスト活用効率  コスト / 成果物  トークン効率比  ROI指標      ', '2026-02-14 16:26:01',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        36, 15, 3,
        'Readmeにも追加してください。\\ 資料を作成した場合は必ずReadmeの関連資料を更新することとしてください\\ Claude.mdに記載してください\\ また、資料のテンプレート,も記載してください\\ 目次,チャートはmermaidなど', '2026-02-14 16:36:27',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        15, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":212191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        15, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":212191}', NULL, NOW()
      );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      16, 1, '3cb6f40b-60d0-4d74-a8f8-3517d3a121d0', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 15:11:02', NULL, NULL,
      0, 0,
      0, 0,
      NULL, 0, 0,
      0, 0,
      NULL, NOW(), NOW()
    );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      17, 1, 'install-test', 'test',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 15:07:29', '2026-02-14 15:07:35', NULL,
      0, 0,
      0, 0,
      0, 0, 0,
      1, 0,
      'test', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        37, 17, 1,
        'test', '2026-02-14 15:07:30',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          24, 17, 37, 'install-test-t1-s0',
          '', 'unknown',
          NULL, 1,
          0, 0,
          0, 0,
          0, 0,
          NOW()
        );
INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      18, 1, '9614f448-5732-4cf7-98ae-05262cca0ea3', 'claude-opus-4-6',
      'thirai-classlab/claude-activity-tracker', 'main',
      NULL,
      '2026-02-14 08:41:57', '2026-02-14 16:59:00', 'clear',
      8041, 92573,
      5174385, 174052774,
      365.1625, 1059, 995,
      3, 53,
      'commitしてプッシュしてください。', NOW(), NOW()
    );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        38, 18, 1,
        'pleskにリリースした環境のダッシュボードなどのフロントエンドのみにBasic認証をつけてください\\ userなしのパスワードがclasslab1993です', '2026-02-14 08:55:07',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          25, 18, 38, '9614f448-5732-4cf7-98ae-05262cca0ea3-t1-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 7,
          11, 3,
          6643, 51684,
          0.0108, 1,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 38, 25,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        39, 18, 2,
        'このパソコンのgit userを変更してください。', '2026-02-14 09:01:07',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        40, 18, 3,
        'emailをthirai@classlab.co.jpに変更してください。', '2026-02-14 09:01:52',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        41, 18, 4,
        'gitのリポジトリを初期化してください。', '2026-02-14 09:48:35',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        42, 18, 5,
        'アンイストール時既に別のフック設定がある場合はどうなりますか？', '2026-02-14 15:00:36',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        43, 18, 6,
        '他のフックが消えてしまう可能性がありますので、\\ プレフィックスをaidd-logにしてください\\ 影響がある箇所全てを修正してください。', '2026-02-14 15:02:40',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          26, 18, 43, '9614f448-5732-4cf7-98ae-05262cca0ea3-t6-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 15,
          16, 4,
          61228, 19281,
          0.0628, 2,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 26,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 26,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          27, 18, 43, '9614f448-5732-4cf7-98ae-05262cca0ea3-t6-s1',
          'general-purpose', 'claude-opus-4-6',
          NULL, 127,
          51, 426,
          129012, 1541127,
          4.7634, 33,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Edit', 'file_edit',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 43, 27,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        44, 18, 7,
        'setup/hooks/config.json\\ envなど必要ファイルを生成するイニシャライズのコマンドをshで作成してください\\ \\ Readmeなどの必要資料も更新してください。', '2026-02-14 15:19:11',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        45, 18, 8,
        'apiキーも自動で生成して.configとenv, API_KEYに設定してください。', '2026-02-14 15:30:27',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        46, 18, 9,
        '戻してください。\\ イニシャライズコマンドで行なってください', '2026-02-14 15:32:24',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        47, 18, 10,
        'フロントエンドとバックエンドもAPIキーで認証してください\\ 修正したら、プレスクにアップロードしてください。', '2026-02-14 15:44:51',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        48, 18, 11,
        '今の修正にとのなってReadmeのコンテンツを修正します。\\ QAでセキュリティについてもフロントエンドのセキュリティは各自でやって欲しい旨\\ ', '2026-02-14 15:53:00',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        49, 18, 12,
        '利用するまでの簡易ステップをユースケース別で作成してください\\\\ 自分のトークン数などを分析する場合\\ チームのAI駆動開発のパフォーマンスを可視化する場合、など手順が異なる利用方法がある場合はユースケースを考えていくつか', '2026-02-14 15:57:22',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        50, 18, 13,
        'ReadNeなどの資料にはそれぞれ目次と資料階層におけるぱんくずリストを付け加えてください。', '2026-02-14 16:04:31',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        51, 18, 14,
        'コミットしてプッシュしてください。', '2026-02-14 16:08:23',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        52, 18, 15,
        'commitしてプッシュしてください。', '2026-02-14 16:45:05',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        53, 18, 16,
        '今取得しているデータ内で何を表示分析できるかを企画します\\ AgentSDKでDBアクションを利用した分析などもやりたいです\\ 各メンバーは何が見たいか、マネージャーは何が見たいかからまずは企画しましょう', '2026-02-14 16:53:14',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          28, 18, 53, '9614f448-5732-4cf7-98ae-05262cca0ea3-t16-s0',
          'Explore', NULL,
          NULL, NULL,
          0, 0,
          0, 0,
          NULL, 0,
          NOW()
        );
INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        54, 18, 17,
        'docs/ai-productivity-kpi-report.md\\ 今取得しているデータ内で何を表示分析できるかを企画します\\ AgentSDKでDBアクションを利用した分析などもやりたいです\\ 各メンバーは何が見たいか、マネージャーは何が見たいかからまずは企画しましょう', '2026-02-14 16:53:58',
        NULL, 0, 0,
        NOW()
      );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          29, 18, 54, '9614f448-5732-4cf7-98ae-05262cca0ea3-t17-s0',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 49,
          80, 22,
          138426, 443563,
          0.1741, 9,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'error', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Grep', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 29,
            'Read', 'search',
            'success', NOW()
          );
INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          30, 18, 54, '9614f448-5732-4cf7-98ae-05262cca0ea3-t17-s1',
          'Explore', 'claude-haiku-4-5-20251001',
          NULL, 20,
          936, 41,
          13136, 106460,
          0.0226, 4,
          NOW()
        );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 30,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 30,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 30,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            18, 54, 30,
            'WebSearch', 'web',
            'success', NOW()
          );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":35,"duration_ms":295373}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":35,"duration_ms":295373}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":36,"duration_ms":58574}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":35,"duration_ms":295373}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":36,"duration_ms":58574}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":37,"duration_ms":60859}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":4,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":35,"duration_ms":295373}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":36,"duration_ms":58574}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":37,"duration_ms":60859}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":38,"duration_ms":185424}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":4,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":6,"duration_ms":119111}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":7,"duration_ms":200832}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":8,"duration_ms":45371}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":9,"duration_ms":43979}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":10,"duration_ms":199954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":11,"duration_ms":32279}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":12,"duration_ms":109790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":13,"duration_ms":84442}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":14,"duration_ms":62172}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":15,"duration_ms":338337}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":16,"duration_ms":1347207}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":34,"duration_ms":31825}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":17,"duration_ms":394684}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":35,"duration_ms":295373}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":18,"duration_ms":70971}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":36,"duration_ms":58574}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":19,"duration_ms":128194}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":37,"duration_ms":60859}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":20,"duration_ms":32191}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":29,"duration_ms":227550}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":38,"duration_ms":185424}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":21,"duration_ms":92187}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":30,"duration_ms":50954}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":22,"duration_ms":263980}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":31,"duration_ms":42665}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":23,"duration_ms":175052}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":32,"duration_ms":336987}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":24,"duration_ms":178717}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":33,"duration_ms":207751}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":25,"duration_ms":164317}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":4,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":26,"duration_ms":386013}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":27,"duration_ms":122182}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":28,"duration_ms":61910}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":0,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":1,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":2,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":2,"duration_ms":67591}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'compact', NULL,
        '{"boundary_index":3,"trigger":"","preTokens":0}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":3,"duration_ms":829636}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":0,"duration_ms":158790}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":4,"duration_ms":51598}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":1,"duration_ms":894364}', NULL, NOW()
      );
INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        18, 'turn_duration', NULL,
        '{"turn_index":5,"duration_ms":75650}', NULL, NOW()
      );