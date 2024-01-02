import express from 'express'
import cors from 'cors'
const app = express()

app.use(express.json())
app.use(cors({
  origin: '*',
})) // TODO: cache this so that we dont make additional preflight requests

const websocketIds: any = {}

app.get('/proxy/:id', (req, res) => {
  res.send({ messages: [] })
})

app.post('/getId', (req, res) => {
  const id = Math.random().toString(36).slice(2, 11)
  websocketIds[id] = req.body
  res.send({ id })
})

app.listen(9000)