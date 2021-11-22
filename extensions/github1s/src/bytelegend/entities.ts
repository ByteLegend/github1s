import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { CommitTreeDataProvider } from '@/views/commit-list-view';

const commitTreeDataProvider = new CommitTreeDataProvider();

export class AnswerCommit {
	constructor(
		readonly title: string,
		readonly sha: string,
		readonly checkRunId: string,
		readonly time: string,
		readonly conclusion?: string,
		readonly parentSha?: string
	) {}

	get stale(): boolean {
		const tenMinutesAgo = new Date(
			new Date().getTime() - 10 * 60 * 1000
		).toISOString();
		return this.time < tenMinutesAgo;
	}

	async getChildren(): Promise<TreeItem[]> {
		const changedFiles = await commitTreeDataProvider.getCommitFileItems({
			author: { avatar_url: '', login: '' },
			commit: { author: { date: '', email: '', name: '' }, message: '' },
			sha: this.sha,
			parents: [
				{
					sha: this.parentSha,
				},
			],
		});
		return changedFiles;
	}

	get id() {
		return this.sha;
	}

	iconPath() {
		if (!this.conclusion) {
			return this.stale ? warningIcon : loadingIcon;
		} else if (this.conclusion === CheckRunConclusion.SUCCESS) {
			return greenTickIcon;
		} else {
			return redCrossIcon;
		}
	}

	get treeItem(): TreeItem {
		return {
			label: this.title,
			id: this.id,
			iconPath: this.iconPath(),
			collapsibleState: TreeItemCollapsibleState.Collapsed,
			contextValue: 'MyAnswer',
			command: {
				title: 'showAnswerLog',
				command: 'bytelegend.showAnswerLog',
				arguments: [this.id],
			},
		};
	}
}

const greenTickIcon = Uri.parse(
	"data:image/svg+xml,%3Csvg class='icon' viewBox='0 0 1418 1024' xmlns='http://www.w3.org/2000/svg' width='276.953' height='200'%3E%3Cpath d='M491.192 1023.803L.136 539.637l111.888-110.274 379.168 373.892L1305.549.433l111.888 110.274-926.245 913.096z' fill='%2322863a'/%3E%3C/svg%3E"
);
const redCrossIcon = Uri.parse(
	"data:image/svg+xml,%3Csvg class='icon' viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath d='M572.314 512L833.74 773.427c16.691 16.691 16.691 43.725 0 60.314s-43.725 16.691-60.314 0L512 572.314l-261.427 261.53c-16.691 16.69-43.725 16.69-60.314 0-16.691-16.692-16.691-43.726 0-60.314L451.686 512l-261.53-261.427c-16.69-16.691-16.69-43.725 0-60.314 16.692-16.691 43.726-16.691 60.314 0L512 451.686 773.427 190.26c16.691-16.691 43.725-16.691 60.314 0 16.691 16.691 16.691 43.725 0 60.314L572.314 512z' fill='%23d81e06'/%3E%3C/svg%3E"
);
const warningIcon = Uri.parse(
	"data:image/svg+xml,%3Csvg class='icon' viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath d='M934.4 770.133l-328.533-588.8C586.667 147.2 550.4 128 512 128s-74.667 21.333-93.867 53.333L89.6 770.133c-19.2 34.134-19.2 76.8 0 110.934s55.467 57.6 93.867 57.6h657.066c40.534 0 74.667-21.334 93.867-57.6 19.2-34.134 19.2-76.8 0-110.934zM480 362.667c0-17.067 14.933-32 32-32s29.867 12.8 32 29.866V640c0 17.067-14.933 32-32 32s-29.867-12.8-32-29.867V362.667zM512 832c-23.467 0-42.667-19.2-42.667-42.667s19.2-42.666 42.667-42.666 42.667 19.2 42.667 42.666S535.467 832 512 832z' fill='%23d81e06'/%3E%3C/svg%3E"
);
const loadingIcon = Uri.parse(
	'data:image/gif;base64,R0lGODlhIAAgAPMAAMrKyoiIiLGxsevr67+/v9TU1H9/fz8/P2pqalVVVSoqKpSUlKmpqRUVFf///wAAACH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUU4MEFBRTQxQkFCMTFFNjkyRTJENEE2MjgwNzUzNUUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUU4MEFBRTUxQkFCMTFFNjkyRTJENEE2MjgwNzUzNUUiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRTgwQUFFMjFCQUIxMUU2OTJFMkQ0QTYyODA3NTM1RSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRTgwQUFFMzFCQUIxMUU2OTJFMkQ0QTYyODA3NTM1RSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t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'
);

export class PullRequestAnswer {
	constructor(
		readonly title: string,
		readonly baseRepoFullName: string,
		readonly headRepoFullName: string,
		readonly number: string,
		readonly branch: string,
		readonly time: string,
		readonly open: boolean,
		readonly accomplished: boolean,
		readonly commits: AnswerCommit[]
	) {}

	iconPath() {
		return this.commits.length === 0 ? null : this.commits[0].iconPath();
	}

	get treeItem(): TreeItem {
		// don't show link icon for dummy check run
		const contextValue = this.id.startsWith('DUMMY-CHECK-RUN')
			? ''
			: 'MyAnswer';
		return {
			label: this.title,
			id: this.id,
			iconPath: this.iconPath(),
			collapsibleState: TreeItemCollapsibleState.Collapsed,
			command: {
				title: 'showAnswerLog',
				command: 'bytelegend.showAnswerLog',
				arguments: [this.id],
			},
			contextValue,
		};
	}

	get htmlUrl() {
		return `https://github.com/${this.baseRepoFullName}/pull/${this.number}`;
	}

	get id() {
		return this.htmlUrl;
	}
}

export const CheckRunConclusion = {
	ACTION_REQUIRED: 'ACTION_REQUIRED',
	CANCELLED: 'CANCELLED',
	FAILURE: 'FAILURE',
	NEUTRAL: 'NEUTRAL',
	SUCCESS: 'SUCCESS',
	SKIPPED: 'SKIPPED',
	STALE: 'STALE',
	TIMED_OUT: 'TIMED_OUT',
};
