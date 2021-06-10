import { openLog } from '../common/logger'
import iconUrlDatabase from '../database/icon-url-database'
import timerService from '../service/timer-service'
import { extractHostname, isBrowserUrl } from '../util/pattern'
import versionManager from './version-manager'

openLog()


let lastLoopTime = Date.now()

let timeMap: { [host: string]: { focus: number, run: number } } = {}

setInterval(() => {
    const now = Date.now()
    const realInterval = now - lastLoopTime
    lastLoopTime = now
    chrome.windows.getAll(windows => {
        const hostSet: Set<string> = new Set()
        let focusHost = ''
        Promise.all(
            windows.map(w => {
                const isFocusWindow = !!w.focused
                return new Promise<void>(resolve => {
                    chrome.tabs.query({ windowId: w.id }, tabs => {
                        tabs.forEach(tab => {
                            const url = tab.url
                            if (!url) return
                            if (isBrowserUrl(url)) return
                            const host = extractHostname(url)
                            if (host) {
                                hostSet.add(host)
                                isFocusWindow && tab.active && (focusHost = host)
                            } else {
                                console.log('Detect blank host:', url)
                            }
                        })
                        resolve()
                    })
                })
            })
        ).then(() => {
            hostSet.forEach(host => {
                let data = timeMap[host]
                !data && (timeMap[host] = data = { focus: 0, run: 0 })
                focusHost === host && (data.focus += realInterval)
                data.run += realInterval
            })
        })
    })
}, 512)

setInterval(() => {
    timerService.addFocusAndTotal(timeMap)
    timeMap = {}
}, 2048)

chrome.runtime.onInstalled.addListener(detail => versionManager.onChromeInstalled(detail.reason))

chrome.webNavigation.onCompleted.addListener((detail) => {
    if (detail.frameId > 0) {
        // we don't care about activity occurring within a subframe of a tab
        return
    }
    chrome.tabs.get(detail.tabId, tab => {
        const domain = extractHostname(tab.url)
        const iconUrl = tab.favIconUrl
        if (!domain || !iconUrl) return
        iconUrlDatabase.put(domain, iconUrl)
    })
})