import { createSessionRepository } from '../server/sessionRepository.js'
import { createAiStateRepository } from '../server/aiStateRepository.js'

let repository
const getRepository = () => {
  repository ||= createSessionRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return repository
}
let aiRepository
const getAiRepository = () => {
  aiRepository ||= createAiStateRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return aiRepository
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  try {
    if (request.method === 'GET') {
      const session = await getRepository().get(request.query?.deviceId)
      return response.status(200).json({ session })
    }
    if (request.method === 'PUT') {
      const result = await getRepository().save(request.body || {})
      return response.status(200).json(result)
    }
    if (request.method === 'DELETE') {
      const deviceId = request.query?.deviceId
      const [result] = await Promise.all([
        getRepository().remove(deviceId),
        getAiRepository().remove(deviceId),
      ])
      return response.status(200).json(result)
    }
    response.setHeader('Allow', 'GET, PUT, DELETE')
    return response.status(405).json({ error: 'method not allowed' })
  } catch (error) {
    console.error('session api error', error)
    return response.status(500).json({ error: 'session storage unavailable' })
  }
}
