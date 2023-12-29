import { ErrorBoundary, Show, Suspense, createContext, createMemo, createResource, createSignal, useContext } from 'solid-js'
import * as api from "./api.ts"
import AuthScreen from './AuthScreen.tsx'
import MainScreen from './MainScreen.tsx'

type Ctx = {
    wsClient: api.WebsocketClient
    me: {
        name: string
        color: string
    }
}

const AppContext = createContext<Ctx>()

export function useAppContext() {
    const ctx = useContext(AppContext)

    if (!ctx) throw new Error("AppContext not found")

    return ctx
}

function App() {
    const [name, setName] = createSignal("")
    const [wsClient, setWsClient] = createSignal<api.WebsocketClient | null>(null)

    const choosedName = createMemo(() => {
        if (wsClient() && name()) return name()

        return null
    })

    const [color] = createResource(choosedName, api.getUsersColor)

    const credentials = createMemo(() => {
        const w = wsClient()
        const n = choosedName()
        const c = color()

        if (w && n && c) return [w, n, c] as const

        return null
    })

    function auth(name: string) {
        const client = new api.WebsocketClient(name)

        function onOpen() {
            setWsClient(client)
        }

        client.connection.onopen = onOpen
    }

    return (
        <Show
            when={credentials()}
            fallback={<AuthScreen auth={auth} name={name} setName={setName} />}
        >
            {(credentials) =>
                <AppContext.Provider value={{
                    wsClient: credentials()[0],
                    me: {
                        name: credentials()[1],
                        color: credentials()[2]
                    }
                }}>
                    <ErrorBoundary fallback={(err) => <p>{err.toString()}</p>}>
                        <MainScreen />
                    </ErrorBoundary>
                </AppContext.Provider>
            }
        </Show>
    )
}

export default App
