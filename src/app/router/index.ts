/**
 * Copyright (c) 2021 Hengyang Zhang
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { App } from "vue"
import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router"
import RouterDatabase from "@db/router-database"
import { OPTION_ROUTE, TREND_ROUTE, LIMIT_ROUTE } from "./constants"

const dataRoutes: RouteRecordRaw[] = [
    {
        path: '/data',
        redirect: '/data/report',
    },
    // Needn't nested router 
    {
        path: '/data/report',
        component: () => import('../pages/report')
    }, {
        path: TREND_ROUTE,
        component: () => import('../pages/trend')
    }, {
        path: '/data/manage',
        component: () => import('../pages/data-manage')
    }
]

const behaviorRoutes: RouteRecordRaw[] = [
    {
        path: '/behavior',
        redirect: '/behavior/habit'
    }, {
        path: '/behavior/habit',
        component: () => import('../pages/habit')
    }, {
        path: LIMIT_ROUTE,
        component: () => import('../pages/limit')
    }
]

const additionalRoutes: RouteRecordRaw[] = [
    {
        path: '/additional',
        redirect: '/additional/whitelist'
    }, {
        path: '/additional/site-manage',
        component: () => import('../pages/site-manage')
    }, {
        path: '/additional/whitelist',
        component: () => import('../pages/whitelist')
    }, {
        path: '/additional/rule-merge',
        component: () => import('../pages/rule-merge')
    }, {
        path: OPTION_ROUTE,
        component: () => import('../pages/option')
    }
]

const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/data' },
    ...dataRoutes,
    ...behaviorRoutes,
    ...additionalRoutes
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

const db: RouterDatabase = new RouterDatabase(chrome.storage.local)

async function handleChange() {
    await router.isReady()
    const current = router.currentRoute.value.fullPath
    current && await db.update(current)
    router.afterEach((to, from, failure: Error | void) => {
        if (failure || to.fullPath === from.fullPath) return
        db.update(to.fullPath)
    })
}

export default (app: App) => {
    app.use(router)
    handleChange()
}
