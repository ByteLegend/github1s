import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { PullRequestAnswer } from '@/bytelegend/entities';
import { byteLegendContext } from '@/bytelegend/context';
import { TreeItem } from 'vscode';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	{ id: 'bytelegend.updateMyAnswers', callback: updateMyAnswers },
	{ id: 'bytelegend.log', callback: log },
	{ id: 'bytelegend.showLog', callback: showLog },
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

async function updateMyAnswers(answers: any[]) {
	await byteLegendContext.updateAnswers(
		answers.map((answer) => {
			return PullRequestAnswer.fromJSON(answer);
		})
	);
}

function log(message: string) {
	console.log(message);
}

async function submitAnswer() {
	const initData = await vscode.commands.executeCommand(
		'bytelegend.getInitData'
	);

	console.log(initData);

	await byteLegendContext.submitAnswer();
}

async function appendLog(checkRunId: any, lines: string[]) {
	await byteLegendContext.appendLog(checkRunId.toString(), lines);
}

function showLog(treeItem: TreeItem) {
	console.log(treeItem);
	// byteLegendContext.showLog(checkRunId);
	// try {
	// 	vscode.commands.executeCommand('workbench.action.terminal.toggleTerminal');
	// vscode.window.createTerminal('test').sendText('111\r\n222\r\n333\r\n');
	// 	// vscode.window.activeTerminal.sendText('1\n2\n3\n');
	// } catch (e) {
	// 	console.trace(e);
	// }
}
