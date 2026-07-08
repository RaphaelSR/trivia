import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as typeof global.TextEncoder
  global.TextDecoder = TextDecoder as typeof global.TextDecoder
}

