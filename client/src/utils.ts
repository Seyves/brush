import { NoInfer, ResourceFetcher, ResourceOptions, createEffect, createResource } from "solid-js"
import { createStore, produce } from "solid-js/store"

export function createThrottler<Args extends readonly any[]>(callback: (...args: Args) => any, delay: number) {
    let prevStamp: number | null = null

    return function(...args: Args) {
        const nowStamp = new Date().getTime()

        if (!prevStamp) {
            callback(...args)
        } else {
            if (nowStamp - prevStamp < delay) return
            callback(...args)
        }

        prevStamp = nowStamp
    }
}

export function createResourseStore<T extends Object, R = unknown>(
    fetcher: ResourceFetcher<true, T, R>,
    options?: ResourceOptions<NoInfer<T>, true>,
    initValue?: T,
) {
    const [fetched] = createResource(fetcher, options || {})

    const [data, setData] = createStore<T>(initValue || {} as T)

    createEffect(() => {
        const val = fetched()
        if (val) setData(val)
    })

    function setProducedData(callback: (data: T) => void) {
        setData(produce(callback))
    }

    return [data, setProducedData] as const
}
