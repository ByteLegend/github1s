import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider/index';
import { getExtensionContext } from '@/helpers/context';

import * as vscode from 'vscode';

export class HackyFileSystemProvider extends GitHub1sFileSystemProvider {
	private superReadFile: (Uri) => Promise<Uint8Array> = this['readFile'];

	constructor() {
		super();
		vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.contentChanges.length === 0) {
				return;
			}
			vscode.workspace.textDocuments.forEach((doc) => {
				console.log(`Open? ${doc.fileName}`);
			});
			const changedDoc = vscode.workspace.textDocuments.find((doc) => {
				return doc.fileName === e.document.fileName;
			});
			if (changedDoc) {
				const changedDocText = changedDoc.getText();
				getExtensionContext()
					.globalState.update(
						`${GitHub1sFileSystemProvider.scheme}:${changedDoc.fileName}`,
						changedDocText
					)
					.then(
						() => {},
						(e) => {
							console.trace(e);
						}
					);
			}
		});
	}

	readFile: (Uri) => Promise<Uint8Array> = (uri) => {
		return this.superReadFile(uri).then((cleanFile) => {
			const localVersion: string = getExtensionContext().globalState.get(
				uri.toString()
			);
			if (localVersion) {
				return new TextEncoder().encode(localVersion);
			} else {
				return cleanFile;
			}
		});
	};
}
