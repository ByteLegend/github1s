import { AnswerCommit, PullRequestAnswer } from '@/bytelegend/entities';
import { MyAnswerTreeDataProvider } from '@/bytelegend/my-answer-list-view';
import * as vscode from 'vscode';
import { TreeItem } from 'vscode';
import { ByteLegendLogManager } from '@/bytelegend/bytelegendLogManager';
import { runCatching } from '@/bytelegend/commands';
import router from '@/router';
import { initialVSCodeState } from '@/extension';

/**
 * Router states:
 *
 * 1. Upon open, if there's any PR open, switch to that PR. Otherwise, use main.
 * 2. Upon submitting success:
 *   - if the latestOpenPR is marked as successful, do nothing (or "restart the webeditor to create next answer")
 *   - if a new PR is created, switch to that branch.
 */
export class ByteLegendContext {
	readonly answerTreeDataProvider: MyAnswerTreeDataProvider = new MyAnswerTreeDataProvider(
		this
	);
	private logManager = new ByteLegendLogManager(this);
	private _initData: any;

	async init() {
		this._initData = await vscode.commands.executeCommand(
			'bytelegend.getInitData'
		);
		await vscode.commands.executeCommand(
			'bytelegend.postMessageToParentWindow',
			{
				bytelegendEvent: 'webeditor.init.completed',
			}
		);
		if (this._initData) {
			await this.updateAnswers(this._initData.answers);
			const anyLiveLogs =
				this._initData.liveLogs && this._initData.liveLogs.length > 0;
			const anyUnfinished = this.answerTreeDataProvider.answers.find(
				(answer) => !answer.accomplished
			);

			if (anyLiveLogs || anyUnfinished) {
				await vscode.commands.executeCommand(
					'bytelegend.views.my-answer-list.focus'
				);
			}

			if (anyLiveLogs) {
				this._initData.liveLogs.forEach((liveLog) => {
					this.logManager
						.getOrCreateLog(liveLog.id, this.determineLogName(liveLog.id), true)
						.appendLines(liveLog.logs);
				});
				await this.showAnswerLog(this._initData.liveLogs[0].id);
			}
		}
	}

	// Adapt a Kotlin `PullRequestAnswer` to TypeScript `PullRequestAnswer`
	private toTypeScriptPullRequestAnswer(jsonObj: any): PullRequestAnswer {
		const checkRunSha = new Set();
		const checkRuns = jsonObj.checkRuns;

		// First step: there might be more than 1 check runs for same commit, remove the duplicate commits
		const deduplicatedCheckRuns = checkRuns.filter((item) => {
			if (checkRunSha.has(item.sha)) {
				return false;
			} else {
				checkRunSha.add(item.sha);
				return true;
			}
		});

		// Second step: scan the list to get all commits.
		const answerCommits: AnswerCommit[] = deduplicatedCheckRuns.map(
			(item, index, array) =>
				this.toAnswerCommit(
					item,
					index == array.length - 1 ? null : array[index + 1].sha
				)
		);
		return new PullRequestAnswer(
			this.getI18nText(
				'MyAnswerAt',
				this.formatIso8601(jsonObj.lastUpdatedTime)
			),
			jsonObj.baseRepoFullName,
			jsonObj.headRepoFullName,
			jsonObj.number,
			jsonObj.branch,
			jsonObj.lastUpdatedTime,
			jsonObj.open,
			jsonObj.accomplished,
			answerCommits
		);
	}

	// Adapt a Kotlin CheckRun to TypeScript `AnswerCommit`
	private toAnswerCommit(jsonObj: any, parentSha?: string): AnswerCommit {
		return new AnswerCommit(
			this.getI18nText(
				'CommitAt',
				jsonObj.sha.substring(0, 7),
				this.formatIso8601(jsonObj.time)
			),
			jsonObj.sha,
			jsonObj.id,
			jsonObj.time,
			jsonObj.conclusion,
			parentSha
		);
	}

	private formatIso8601(iso8601: string): string {
		return new Date(iso8601).toLocaleString(this.locale);
	}

	get locale(): string {
		return this._initData.locale;
	}

	get missionId(): string {
		return this._initData.missionId;
	}

	get challengeId(): string {
		return this._initData.challengeId;
	}

	get repoFullName(): string {
		return this._initData.repoFullName;
	}

	get apiServer(): string {
		return this._initData.apiServer;
	}

	get whitelist(): string {
		return this._initData.whitelist;
	}

	get latestOpenPullRequestHtmlUrl(): string {
		return this.answerTreeDataProvider.answers.find((pr) => pr.open)?.htmlUrl;
	}

	getI18nText(key: string, ...args: string[]): string {
		let template = this._initData.i18nTexts[key];
		args.forEach(
			(arg, index) => (template = template.replace(`{${index}}`, arg))
		);
		return template;
	}

	async updateAnswers(answers: any[]) {
		const oldAnswers = this.answerTreeDataProvider.answers;
		const newAnswers = answers.map((answer) =>
			this.toTypeScriptPullRequestAnswer(answer)
		);
		if (
			oldAnswers.length > 0 &&
			newAnswers.length > 0 &&
			oldAnswers[0].id == newAnswers[0].id &&
			oldAnswers[0].commits.length > 0 &&
			newAnswers[0].commits.length == 0
		) {
			// when the PR is just created, check runs haven't started yet.
			// otherwise we'll get an empty commit list
			return;
		}
		await this.answerTreeDataProvider.updateTree(newAnswers);
	}

	async appendLog(checkRunId: string, lines: string[]) {
		this.logManager.clearAllPendingStatuses();
		await this.showTerminal();
		await this.logManager
			.getOrCreateLog(checkRunId, this.determineLogName(checkRunId), true)
			.appendLines(lines);
	}

	private async showTerminal() {
		if (
			!(await vscode.commands.executeCommand('bytelegend.isTerminalVisible'))
		) {
			await vscode.commands.executeCommand(
				'workbench.action.terminal.toggleTerminal'
			);
		}
	}

	async showAnswerLog(treeIdOrItem: TreeItem | string) {
		await this.showTerminal();
		const nodeId =
			typeof treeIdOrItem === 'string'
				? treeIdOrItem
				: (treeIdOrItem as TreeItem).id;

		const node = this.answerTreeDataProvider.getNodeById(nodeId);
		if (node instanceof AnswerCommit) {
			await this.logManager.showCheckRunLog(
				node.checkRunId,
				this.determineLogName(node.checkRunId),
				!node.conclusion
			);
		} else if (node instanceof PullRequestAnswer) {
			const commit = node.commits[0];
			await this.logManager.showCheckRunLog(
				commit.checkRunId,
				this.determineLogName(commit.checkRunId),
				!commit.conclusion
			);
		} else {
			console.log(`Skip unrecognized answer: ${nodeId}`);
		}
	}

	private determineLogName(logId: string) {
		return (
			this.answerTreeDataProvider.getNodeByCheckRunId(logId)?.title || logId
		);
	}

	async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	private static async setSubmitAnswerButton(
		spinning: boolean,
		textId: string
	) {
		await vscode.commands.executeCommand(
			'bytelegend.postMessageToParentWindow',
			{
				bytelegendEvent: 'answer.button.control',
				bytelegendEventPayload: {
					spinning,
					textId,
				},
			}
		);
	}

	private inWhitelist(changedFilePath: string): boolean {
		for (const item of this.whitelist) {
			if (item.endsWith('/') && changedFilePath.startsWith(item)) {
				return true;
			} else if (item == changedFilePath) {
				return true;
			}
		}
		return false;
	}

	async submitAnswer() {
		const dirtyDocs = vscode.workspace.textDocuments.filter((doc) => {
			return doc.isDirty;
		});

		if (
			!new RegExp(`${this.repoFullName}/(tree|blob)/main`).test(
				await this.getBrowserUrl()
			) &&
			!this.latestOpenPullRequestHtmlUrl
		) {
			vscode.window.showInformationMessage(
				this.getI18nText('YouHaveAccomplishedThisChallenge')
			);
			ByteLegendContext.setSubmitAnswerButton(false, 'SubmitAnswer');
			return;
		}

		if (dirtyDocs.length === 0) {
			vscode.window.showInformationMessage(this.getI18nText('NothingToSubmit'));
			ByteLegendContext.setSubmitAnswerButton(false, 'SubmitAnswer');
		} else {
			const changedFiles = {};
			const changeFilePathsNotInWhitelist = [];

			dirtyDocs.forEach((doc) => {
				// github1s:/src/main/java/com/bytelegend/Challenge.java
				const filePath = doc.uri.toString().substring('github1s:/'.length);
				if (!this.inWhitelist(filePath)) {
					changeFilePathsNotInWhitelist.push(filePath);
				}
				changedFiles[filePath] = doc.getText();
			});

			if (changeFilePathsNotInWhitelist.length != 0) {
				vscode.window.showErrorMessage(
					this.getI18nText(
						'ChangesAreNotAllowed',
						changeFilePathsNotInWhitelist.join('\n')
					)
				);
				ByteLegendContext.setSubmitAnswerButton(false, 'SubmitAnswer');
				return;
			}

			const payload = {
				changes: changedFiles,
			};

			if (this.latestOpenPullRequestHtmlUrl) {
				payload['pullRequestHtmlUrl'] = this.latestOpenPullRequestHtmlUrl;
			}

			const pendingStatusLog = this.logManager.showPendingStatus(
				this.getI18nText('SubmittingAnswer')
			);

			const [err, response] = await runCatching(
				this.invokeApi(
					'POST',
					`/game/api/mission/${this.missionId}/${this.challengeId}/code`,
					payload
				)
			);
			if (err) {
				pendingStatusLog.stopPendingStatus();
				vscode.window.showErrorMessage(err.toString());
				ByteLegendContext.setSubmitAnswerButton(false, 'SubmitAnswer');
			} else if (response.status > 299) {
				pendingStatusLog.stopPendingStatus();
				vscode.window.showErrorMessage(
					this.getI18nText('HttpResponseError'),
					response.status.toString(),
					await response.text()
				);
				ByteLegendContext.setSubmitAnswerButton(false, 'SubmitAnswer');
			} else {
				const newPullRequestAnswerInResponse = this.toTypeScriptPullRequestAnswer(
					await response.json()
				);

				for (const doc of dirtyDocs) {
					await doc.save();
				}

				const currentAnswers = this.answerTreeDataProvider.answers;
				const samePullRequestAnswer = currentAnswers.find(
					(item) => item.id == newPullRequestAnswerInResponse.id
				);
				if (samePullRequestAnswer) {
					samePullRequestAnswer.commits.unshift(
						newPullRequestAnswerInResponse.commits[0]
					);
				} else {
					this._initData.latestOpenPullRequest =
						newPullRequestAnswerInResponse.htmlUrl;
					await this.switchToBranch(newPullRequestAnswerInResponse.branch);
					currentAnswers.unshift(newPullRequestAnswerInResponse);
				}
				await this.answerTreeDataProvider.updateTree(currentAnswers);
				await vscode.commands.executeCommand(
					'bytelegend.views.my-answer-list.focus'
				);

				ByteLegendContext.setSubmitAnswerButton(true, 'CheckingAnswer');
			}
		}
	}

	// {baseUrl}/{owner}/{repo}/blob/main/{path} -> {baseUrl}/{owner}/{repo}/blob/{newBranch}/{path}
	// {baseUrl}/{owner}/{repo}/tree/main/{path}? -> {baseUrl}/{owner}/{repo}/tree/{newBranch}/{path}
	// {baseUrl}/ByteLegendQuest/java-fix-add/tree/main -> {baseUrl}/ByteLegendQuest/java-fix-add/tree/{newBranch}
	// {baseUrl}/ByteLegendQuest/java-fix-add/blob/main/src/main/java/com/bytelegend/Challenge.java ->
	// {baseUrl}/ByteLegendQuest/java-fix-add/blob/{newBranch}/src/main/java/com/bytelegend/Challenge.java
	private async switchToBranch(newBranch: string) {
		const docs = vscode.workspace.textDocuments;

		const oldUrl = await this.getBrowserUrl();
		const [newUrl, path] = this.replaceUrlWithNewBranch(oldUrl, newBranch);
		console.log(`Switch to ${newUrl}`);
		if (oldUrl == newUrl) {
			console.warn(`Can't switch to ${newBranch}: ${oldUrl}`);
		} else {
			await router.replace(newUrl);
			await initialVSCodeState();
		}
	}

	private async getBrowserUrl(): Promise<string> {
		return (await vscode.commands.executeCommand(
			'github1s.vscode.get-browser-url'
		)) as string;
	}

	private replaceUrlWithNewBranch(oldUrl: string, newBranch: string): string[] {
		const regex = new RegExp(`/${this.repoFullName}/(tree|blob)/main(.*)`);
		const matchResult = regex.exec(oldUrl);

		if (matchResult) {
			return [
				`/${this.repoFullName}/${matchResult[1]}/${newBranch}${matchResult[2]}`,
				matchResult[2],
			];
		} else {
			return [oldUrl];
		}
	}

	async invokeApi(
		method: string,
		path: string,
		payload?: any
	): Promise<Response> {
		const init: RequestInit = {
			method,
			credentials: 'include',
		};
		if (payload) {
			init['headers'] = {
				'Content-Type': 'application/json',
			};
			init['body'] = JSON.stringify(payload);
		}
		const [err, response] = await runCatching(
			fetch(`${this.apiServer}${path}`, init)
		);
		if (err) {
			vscode.window.showErrorMessage(err.stack);
			return Promise.reject(err);
		} else {
			return response;
		}
	}
}

export const byteLegendContext = new ByteLegendContext();