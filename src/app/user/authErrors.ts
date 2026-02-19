import type { AuthError } from '@supabase/supabase-js'
import type { Namespace, TFunction } from 'i18next'

export function getAuthErrorMessage<NS extends Namespace>(error: AuthError, t: TFunction<NS>): string {
  return getAuthErrorMessageFromCode(error.code, t)
}

export function getAuthErrorMessageFromCode<NS extends Namespace>(
  errorCode: string | undefined,
  t: TFunction<NS>
): string {
  switch (errorCode) {
    case 'invalid_credentials':
      return t($ => $.auth.errors.invalidCredentials, { ns: 'common' })
    case 'weak_password':
      return t($ => $.auth.errors.weakPassword, { ns: 'common' })
    case 'email_not_confirmed':
      return t($ => $.auth.errors.emailNotConfirmed, { ns: 'common' })
    case 'user_already_exists':
    case 'duplicate':
      return t($ => $.auth.errors.emailAlreadyExists, { ns: 'common' })
    case 'invalid_token':
    case 'expired_token':
    case 'invalid_grant':
    case 'otp_expired':
      return t($ => $.auth.errors.invalidToken, { ns: 'common' })
    default:
      return t($ => $.auth.errors.generic, { ns: 'common' })
  }
}
