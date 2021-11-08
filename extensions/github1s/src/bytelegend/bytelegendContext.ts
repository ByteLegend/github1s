import { PullRequestAnswer } from '@/bytelegend/entities';
import { MyAnswerTreeDataProvider } from '@/bytelegend/my-answer-list-view';
import { Terminal } from 'vscode';
import * as vscode from 'vscode';

type UnitFunction = () => Promise<void>;

export class ByteLegendContext {
	readonly answerTreeDataProvider: MyAnswerTreeDataProvider = new MyAnswerTreeDataProvider();
	readonly checkRunLogs: Map<string, CheckRunLog> = new Map();

	public async updateAnswers(answers: PullRequestAnswer[]) {
		await this.runCatching(async () => {
			await this.answerTreeDataProvider.updateTree(answers);
		});
	}

	private toggleTerminal() {
		vscode.commands.executeCommand('workbench.action.terminal.toggleTerminal');
	}

	public async appendLog(logId: string, lines: string[]) {
		this.toggleTerminal();
		await this.runCatching(async () => {
			const logName =
				this.answerTreeDataProvider.getNodeByCheckRunId(logId)?.title || '';
			this.getOrCreateLog(logId, logName, true).appendLines(lines);
		});
	}

	public async submitAnswer() {
		await this.runCatching(async () => {
			const dirtyDocs = vscode.workspace.textDocuments.filter((doc) => {
				return doc.isDirty;
			});

			if (dirtyDocs.length === 0) {
				vscode.window.showInformationMessage('There is nothing to submit.');
			} else {
			}
		});
	}

	public showLog(logId: string, logName: string, live: boolean) {
		this.toggleTerminal();
		this.getOrCreateLog(logId, logName, live).activate();
	}

	private getOrCreateLog(
		logId: string,
		logName: string,
		live: boolean
	): CheckRunLog {
		if (!this.checkRunLogs.has(logId)) {
			this.checkRunLogs.set(logId, new CheckRunLog(logId, logName, live));
		} else {
			const oldLog = this.checkRunLogs.get(logId);
			if (oldLog.live && !live) {
				// we have to create a new log
				oldLog.dispose();
				this.checkRunLogs.set(logId, new CheckRunLog(logId, logName, live));
			}
		}

		const log = this.checkRunLogs.get(logId);

		log.attachTerminalIfNecessary();
		return log;
	}

	private async runCatching(fn: UnitFunction) {
		try {
			await fn();
		} catch (e) {
			console.trace(e);
		}
	}
}

export const byteLegendContext = new ByteLegendContext();

class CheckRunLog {
	// private id: string;
	// private name: string;
	live: boolean;
	private lines: string[] = [];
	private terminal: Terminal;
	// next line to output to the terminal
	private terminalCursorIndex: number;

	constructor(private id: string, private name: string, live: boolean) {
		this.live = live;
	}

	activate() {
		// There seems no API for activating a terminal.
		// We could workaround by deleting all other terminals and recreating
		this.attachTerminalIfNecessary();
	}

	attachTerminalIfNecessary() {
		if (!this.terminal) {
			this.terminal = vscode.window.createTerminal(
				this.name ? `${this.name}-${this.id}` : this.id
			);
			this.terminalCursorIndex = this.lines.length;
			this.lines.forEach((line) => {
				this.terminal.sendText(line, true);
			});

			const disposeFunction = this.terminal.dispose;
			this.terminal.dispose = () => {
				this.terminal = null;
				this.terminalCursorIndex = 0;
			};
		}
	}

	appendLines(lines: string[]) {
		if (lines.length === 0) {
			return;
		}
		if (!this.live) {
			throw new Error('Only live log can be appended!');
		}
		this.lines.push(...lines);

		if (this.terminal) {
			lines.forEach((line) => {
				this.terminal.sendText(line, true);
			});
		}
		// User closed the terminal when live log is still running
		// In this case we silently append to a new terminal
		this.attachTerminalIfNecessary();
	}

	dispose() {
		if (this.terminal) {
			this.terminal.dispose();
		}
	}
}
