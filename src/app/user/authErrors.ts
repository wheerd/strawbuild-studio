import type { AuthError } from '@supabase/supabase-js'
import type { TFunction } from 'i18next'

export function getAuthErrorMessage(error: AuthError, t: TFunction): string {
  return getAuthErrorMessageFromCode(error.code, t)
}

export function getAuthErrorMessageFromCode(errorCode: string | undefined, t: TFunction): string {
  switch (errorCode) {
    case 'invalid_credentials':
      return t($ => $.auth.errors.invalidCredentials)
    case 'weak_password':
      return t($ => $.auth.errors.weakPassword)
    case 'email_not_confirmed':
      return t($ => $.auth.errors.emailNotConfirmed)
    case 'user_already_exists':
    case 'duplicate':
      return t($ => $.auth.errors.emailAlreadyExists)
    case 'invalid_token':
    case 'expired_token':
    case 'invalid_grant':
    case 'otp_expired':
      return t($ => $.auth.errors.invalidToken)
    default:
      return t($ => $.auth.errors.generic)
  }
}
