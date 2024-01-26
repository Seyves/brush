package main

import (
	"brush/api"
	"brush/middlewares"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func main() {
	r := chi.NewRouter()

    r.Use(middlewares.Cors)

	r.Route("/api/rooms", func(r chi.Router) {
        r.Post("/", api.CreateRoom)

        r.Route("/{roomId}", func(r chi.Router) {
            r.Get("/ws", api.WebsocketHandler)
            r.With(middlewares.Json).Get("/users", api.GetUsers)
            r.With(middlewares.Json).Get("/draws", api.GetDraws)
            r.With(middlewares.Json).Get("/last-positions", api.GetLastPositions)
            r.Get("/color/{user}", api.GetColor)
        })
	})

	r.Handle("/*", http.FileServer(http.Dir("./static")))

	http.ListenAndServe("0.0.0.0:8002", r)
}
