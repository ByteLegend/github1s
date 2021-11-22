import * as vscode from 'vscode';
import { TreeItem } from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { PullRequestAnswer } from '@/bytelegend/entities';
import { byteLegendContext } from '@/bytelegend/bytelegendContext';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	{ id: 'bytelegend.updateAnswers', callback: updateAnswers },
	{ id: 'bytelegend.log', callback: log },
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

async function open(url: string): Promise<void> {
	await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
}

async function openOnGitHub(treeItem: TreeItem) {
	if (treeItem.id.startsWith('https')) {
		await runCatching(open(treeItem.id));
	} else {
		// should be commit id
		const commitId = treeItem.id;
		const prAnswerId = (
			await byteLegendContext.answerTreeDataProvider.getParent(treeItem)
		).id;
		const prAnswer = byteLegendContext.answerTreeDataProvider.getNodeById(
			prAnswerId
		) as PullRequestAnswer;
		await runCatching(
			open(
				`https://github.com/${prAnswer.headRepoFullName}/commit/${treeItem.id}`
			)
		);
	}
}

async function showAnswerLog(nodeId: string) {
	await runCatching(byteLegendContext.showAnswerLog(nodeId));
}

async function updateAnswers(answers: any[]) {
	await runCatching(byteLegendContext.updateAnswers(answers));
}

function log(message: string) {
	console.log(message);
}

async function submitAnswer() {
	await runCatching(byteLegendContext.submitAnswer());
}

async function appendLog(checkRunId: any, lines: string[]) {
	await runCatching(byteLegendContext.appendLog(checkRunId.toString(), lines));
}

export async function runCatching<T>(promise: Promise<T>): Promise<any[]> {
	return promise
		.then((data) => [null, data])
		.catch((err) => {
			console.trace(err);
			return [err];
		});
}
