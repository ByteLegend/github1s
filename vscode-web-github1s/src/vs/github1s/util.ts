/* eslint-disable header/header */
/**
 * @file github1s common utils
 * @autor netcon
 */

export const getBrowserUrl = (): string => {
	return window.location.href;
};

export const getInitData = (): any => {
	return (<any>window).bytelegendInitData
};

export const isTerminalVisible = (): boolean => {
	return document.querySelectorAll(".xterm-viewport").length != 0
}

export const isActivityBarVisible = (): boolean => {
	return document.querySelectorAll(".visible>#workbench\\.parts\\.activitybar").length != 0
}

/**
 * Neither `vscode.window.visibleTextEditors` nor `vscode.window.visibleTextEditors`
 * provides a satisfying API to get visible tab groups.
 */
export const getEditorTabGroups = (): string[][] => {
	const tabGroups = document.querySelectorAll(".tabs-and-actions-container");
	return Array.prototype.map.call(tabGroups, (tabGroup) => {
		const tabs = tabGroup.querySelectorAll(".monaco-icon-name-container")
		return Array.prototype.map.call(tabs, (tab) => tab.innerText);
	}) as string[][]
}

export const postMessageToParentWindow = (message: any) => {
	return window.parent?.postMessage(message, '*')
}

export const replaceBrowserUrl = (url: string) => {
	if (window.history.replaceState) {
		window.history.replaceState(null, '', url);
	}
};

export const delegate = <K extends keyof HTMLElementEventMap>(
	element: HTMLElement,
	selector: string,
	eventName: K,
	handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void => {
	return element?.addEventListener(eventName, function (event) {
		const children = element.querySelectorAll(selector);
		for (let i = 0, len = children.length; i < len; i++) {
			if (children[i] === event.target) {
				handler.call(this, event);
			}
		}
	});
};
