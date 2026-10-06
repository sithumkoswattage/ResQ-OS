import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

const incidents = [
  {
    id: 1042,
    type: 'Fire',
    location: 'Colombo',
    priority: 'Critical',
    status: 'Active'
  },
  // ...
]

export default api