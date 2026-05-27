/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { adaptManagedSettings, IManagedSettingsResponse } from '../../browser/defaultAccount.js';

suite('DefaultAccount.adaptManagedSettings', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	test('empty response yields all-undefined partial (no enterprise policy file present)', () => {
		assert.deepStrictEqual(adaptManagedSettings({}), {
			enabledPlugins: undefined,
			extraKnownMarketplaces: undefined,
			strictKnownMarketplaces: undefined,
		});
	});

	test('passes enabledPlugins through untouched (plugin-ID keys, boolean values)', () => {
		const response: IManagedSettingsResponse = {
			enabledPlugins: {
				'assign-issue-to-copilot@agent-skills': true,
				'my-plugin@acme': false,
			},
		};
		assert.deepStrictEqual(adaptManagedSettings(response).enabledPlugins, {
			'assign-issue-to-copilot@agent-skills': true,
			'my-plugin@acme': false,
		});
	});

	test('passes strictKnownMarketplaces boolean through untouched', () => {
		assert.strictEqual(adaptManagedSettings({ strictKnownMarketplaces: true }).strictKnownMarketplaces, true);
		assert.strictEqual(adaptManagedSettings({ strictKnownMarketplaces: false }).strictKnownMarketplaces, false);
	});

	test('flattens github-source marketplaces to <owner>/<repo>', () => {
		const result = adaptManagedSettings({
			extraKnownMarketplaces: {
				'a': { source: { source: 'github', repo: 'github/agent-skills' } },
				'b': { source: { source: 'github', repo: 'acme/things', ref: 'main' } },
			},
		});
		assert.deepStrictEqual(result.extraKnownMarketplaces, [
			'github/agent-skills',
			'acme/things#main',
		]);
	});

	test('flattens git-source marketplaces to <url>', () => {
		const result = adaptManagedSettings({
			extraKnownMarketplaces: {
				'a': { source: { source: 'git', url: 'https://example.com/repo.git' } },
				'b': { source: { source: 'git', url: 'ssh://git@host/path.git', ref: 'v1' } },
			},
		});
		assert.deepStrictEqual(result.extraKnownMarketplaces, [
			'https://example.com/repo.git',
			'ssh://git@host/path.git#v1',
		]);
	});

	test('handles mixed github + git sources with dedup', () => {
		const result = adaptManagedSettings({
			extraKnownMarketplaces: {
				'a': { source: { source: 'github', repo: 'a/b' } },
				'b': { source: { source: 'git', url: 'https://example.com/r.git' } },
				'c': { source: { source: 'github', repo: 'a/b' } }, // dup
			},
		});
		assert.deepStrictEqual(result.extraKnownMarketplaces, [
			'a/b',
			'https://example.com/r.git',
		]);
	});

	test('handles full populated response (all three fields together)', () => {
		const result = adaptManagedSettings({
			enabledPlugins: { 'p@m': true },
			extraKnownMarketplaces: {
				'a': { source: { source: 'github', repo: 'a/b', ref: 'r' } },
			},
			strictKnownMarketplaces: true,
		});
		assert.deepStrictEqual(result, {
			enabledPlugins: { 'p@m': true },
			extraKnownMarketplaces: ['a/b#r'],
			strictKnownMarketplaces: true,
		});
	});
});
