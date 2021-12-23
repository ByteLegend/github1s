import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { ByteLegendContext } from '@/bytelegend/bytelegendContext';
import { runCatching } from '@/bytelegend/utils';

export class ByteLegendLogManager {
	/**
	 * Key: checkRunId
	 * Value: the log instance
	 */
	private readonly checkRunLogs: Map<string, CheckRunLog> = new Map();
	private readonly context: ByteLegendContext;

	public constructor(context: ByteLegendContext) {
		this.context = context;
	}

	getOrCreateLog(logId: string, logName: string, live: boolean): CheckRunLog {
		if (!this.checkRunLogs.has(logId)) {
			this.checkRunLogs.set(logId, new CheckRunLog(logId, logName));
		} else {
			const oldLog = this.checkRunLogs.get(logId);
			if (oldLog.live && !live) {
				// we have to create a new log
				oldLog.dispose();
				this.checkRunLogs.set(logId, new CheckRunLog(logId, logName));
			}
		}

		const log = this.checkRunLogs.get(logId);

		log.attachTerminalIfNecessary();
		return log;
	}

	private static showFetching(log: CheckRunLog) {
		setTimeout(() => {}, 1000);
	}

	/**
	 * After submitting the answer, we don't know the checkRun id yet.
	 * During this interval, we create a dummy log displaying the pending status.
	 */
	showPendingStatus(line: string): CheckRunLog {
		return this.getOrCreateLog(`PendingStatus-${new Date().getTime()}`, 'Log', true)
			.activate()
			.startPendingStatus(line);
	}

	clearAllPendingStatuses() {
		this.checkRunLogs.forEach((checkRunLog, id) => {
			if (id.startsWith('PendingStatus-')) {
				checkRunLog.stopPendingStatus().dispose();
				this.checkRunLogs.delete(id);
			}
		});
	}

	async showCheckRunLog(checkRunId: string, logName: string, live: boolean) {
		if (checkRunId.startsWith('DUMMY-CHECK-RUN')) {
			// Do nothing, the new events will soon come in and replace the dummy check runs.
			return;
		}
		let currentLog = this.checkRunLogs.get(checkRunId);
		if (!currentLog || (currentLog.live && !live)) {
			currentLog = this.getOrCreateLog(checkRunId, logName, live);
			currentLog.activate();

			currentLog.startPendingStatus(
				this.context.getI18nText('FetchingLog', checkRunId)
			);

			const [err, logResponse] = await runCatching(
				this.context.invokeApi(
					'GET',
					`/game/api/log?repo=${this.context.repoFullName}&checkRunId=${checkRunId}`
				)
			);

			currentLog.stopPendingStatus();

			if (err) {
				currentLog.appendLines(['\x1B[91m']);
				currentLog.appendLines([err.toString()]);
				currentLog.appendLines(['\x1B[0m']);
			} else if (logResponse.status === 404 || logResponse.status === 410) {
				currentLog.appendLines(['\x1B[91m']);
				currentLog.appendLines([this.context.getI18nText('LogCleanedUp')]);
				currentLog.appendLines(['\x1B[0m']);
			} else if (logResponse.status > 399) {
				// https://stackoverflow.com/questions/287871/how-to-print-colored-text-to-the-terminal
				currentLog.appendLines(['\x1B[91m']);
				currentLog.appendLines((await logResponse.text()).split(/\r?\n/));
				currentLog.appendLines(['\x1B[0m']);
			} else {
				currentLog.appendLines((await logResponse.text()).split(/\r?\n/));
			}
		} else {
			currentLog.activate();
		}
	}
}

// Show a pending line:
// Fetching log from XX.
// Fetching log from XX..
// Fetching log from XX...
class CheckRunLogPendingStatus {
	private timer: any;
	private currentDot: number = 0;

	constructor(private log: CheckRunLog, private readonly line: string) {}

	start(): CheckRunLogPendingStatus {
		this.timer = setInterval(() => {
			this.currentDot++;
			this.log.appendLines([
				`\x1B[1A\x1B[K${this.line}${'.'.repeat((this.currentDot % 3) + 1)}`,
			]);
		}, 500);
		return this;
	}

	stop() {
		clearInterval(this.timer);
	}
}

class CheckRunLog {
	private pendingStatus: CheckRunLogPendingStatus;
	live: boolean;
	private lines: string[] = [];
	private terminal: Terminal;
	// next line to output to the terminal
	private terminalCursorIndex: number;

	constructor(readonly id: string, private name: string) {}

	startPendingStatus(line: string): CheckRunLog {
		if (!this.pendingStatus) {
			this.pendingStatus = new CheckRunLogPendingStatus(this, line);
		}
		this.pendingStatus.start();
		return this;
	}

	stopPendingStatus(): CheckRunLog {
		this.pendingStatus?.stop();
		return this;
	}

	activate(): CheckRunLog {
		this.attachTerminalIfNecessary();
		if (vscode.window.activeTerminal?.name !== this.name) {
			vscode.window.terminals.find((t) => t.name === this.name)?.show();
		}
		return this;
	}

	attachTerminalIfNecessary() {
		if (!this.terminal) {
			this.terminal = vscode.window.createTerminal(this.name);
			this.terminalCursorIndex = this.lines.length;
			this.lines.forEach((line) => {
				this.terminal.sendText(line, true);
			});

			const disposeFunction = this.terminal.dispose;
			this.terminal.dispose = () => {
				this.terminal = null;
				this.terminalCursorIndex = 0;
				disposeFunction();
			};
		}
	}

	appendLines(lines: string[]) {
		if (lines.length === 0) {
			return;
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
