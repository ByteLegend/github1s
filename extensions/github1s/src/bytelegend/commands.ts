import * as vscode from 'vscode';
import { TreeItem, Uri } from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { PullRequestAnswer, Tutorial } from '@/bytelegend/entities';
import { byteLegendContext } from '@/bytelegend/bytelegendContext';
import { runCatching } from '@/bytelegend/utils';
import { createVideoTutorial } from '@/bytelegend/video-tutorial-view';
import { createRawHtmlWebview } from '@/bytelegend/raw-html-view';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	{ id: 'bytelegend.updateAnswers', callback: updateAnswers },
	{ id: 'bytelegend.open', callback: open },
	{ id: 'bytelegend.openVideoTutorial', callback: openVideoTutorial },
	{ id: 'bytelegend.showAnswerLog', callback: showAnswerLog },
	{ id: 'bytelegend.openOnGitHub', callback: openOnGitHub },
	{ id: 'bytelegend.appendLog', callback: appendLog },
	{ id: 'bytelegend.submitAnswer', callback: submitAnswer },
];

export const registerByteLegendCommands = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		...commands.map((command) =>
			vscode.commands.registerCommand(command.id, command.callback)
		)
	);
};

async function openVideoTutorial(tutorial: Tutorial) {
	try {
		createVideoTutorial(tutorial);
	} catch (e) {
		console.trace(e);
	}
}

async function openRawHtml(html: string) {
	try {
		createRawHtmlWebview(html);
	} catch (e) {
		console.trace(e);
	}
}

// <html>
// github1s:/path/to/file
// github1s://raw.githubusercontent.com/owner/repo/ref/path/to/file
// github1s://github.com/owner/repo/blob/ref/path/to/file
export async function open(urlOrRawHtml: string) {
	if (urlOrRawHtml.startsWith('<')) {
		await openRawHtml(urlOrRawHtml);
	} else {
		await runCatching(vscodeOpen(parseByteLegendUri(urlOrRawHtml)));
	}
}

async function vscodeOpen(uri: Uri) {
	await vscode.commands.executeCommand('vscode.open', uri);
}

// github1s:/path/to/file -> as it is
// github1s://github.com/owner/repo/blob/main/path/to/file -> Uri { authority="owner+repo+ref" }
// github1s://raw.githubusercontent.com/gradle/gradle/master/README.md -> Uri { authority="owner+repo+ref" }
function parseByteLegendUri(uri: string): Uri {
	if (uri.startsWith('github1s://github.com')) {
		const matchResult = /github.com\/([\w_-]+)\/([\w_-]+)\/blob\/([\w_.-]+)\/(.*)/.exec(
			uri
		);
		return buildByteLegendUri(matchResult[1], matchResult[2], matchResult[3], matchResult[4])
	} else if (uri.startsWith('github1s://raw.githubusercontent.com')) {
		const matchResult = /raw.githubusercontent.com\/([\w_-]+)\/([\w_-]+)\/([\w_.-]+)\/(.*)/.exec(
			uri
		);
		return buildByteLegendUri(matchResult[1], matchResult[2], matchResult[3], matchResult[4])
	} else {
		return Uri.parse(uri);
	}
}

function buildByteLegendUri(owner: string, repo: string, ref: string, relativePathToRoot: string) {
	const ret = Uri.parse(`github1s:/${relativePathToRoot}`)
	if (repo == byteLegendContext.getRepo() && owner == byteLegendContext.getOwner()) {
		// the target url exists in current repo, let's just open it!
		return ret
	} else {
		return ret.with({
			authority: `${repo}+${owner}+${ref}`
		})
	}
}

async function openOnGitHub(treeItem: TreeItem) {
	if (treeItem.id.startsWith('https')) {
		await open(treeItem.id);
	} else {
		// should be commit id
		const commitId = treeItem.id;
		const prAnswerId = (
			await byteLegendContext.answerTreeDataProvider.getParent(treeItem)
		).id;
		const prAnswer = byteLegendContext.answerTreeDataProvider.getNodeById(
			prAnswerId
		) as PullRequestAnswer;
		await open(
			`https://github.com/${prAnswer.headRepoFullName}/commit/${treeItem.id}`
		);
	}
}

async function showAnswerLog(nodeId: string) {
	await runCatching(byteLegendContext.showAnswerLog(nodeId));
}

async function updateAnswers(answers: any[]) {
	await runCatching(byteLegendContext.updateAnswers(answers));
}

async function submitAnswer() {
	await runCatching(byteLegendContext.submitAnswer());
}

async function appendLog(checkRunId: any, lines: string[]) {
	await runCatching(byteLegendContext.appendLog(checkRunId.toString(), lines));
}
