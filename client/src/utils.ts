export function createThrottler<Args>(callback: (args: Args) => any, delay: number) {
    let prevStamp: number | null = null

    return function(args: Args) {
        const nowStamp = new Date().getTime()

        if (!prevStamp) {
            callback(args)
        } else {
            if (nowStamp - prevStamp < delay) return
            callback(args)
        }

        prevStamp = nowStamp
    }
}
