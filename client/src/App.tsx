import { ErrorBoundary, Show, Suspense, createContext, createSignal, useContext } from 'solid-js'
import * as api from "./api.ts"
import AuthScreen from './AuthScreen.tsx'
import MainScreen from './MainScreen.tsx'

type Ctx = {
    wsClient: api.WebsocketClient
    me: {
        name: string
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

    function auth(name: string) {
        const client = new api.WebsocketClient(name)

        function onOpen() {
            setWsClient(client)
        }

        client.connection.onopen = onOpen
    }

    return (
        <Show
            when={wsClient()}
            fallback={<AuthScreen auth={auth} name={name} setName={setName} />}
        >
            {(wsClient) =>
                <AppContext.Provider value={{
                    wsClient: wsClient(),
                    me: {
                        name: name(),
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
