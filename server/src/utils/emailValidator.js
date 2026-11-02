/**
 * Security-focused email validator:
 * 1. Strictly enforces RFC 5322 structure.
 * 2. Rejects missing local part (e.g. "@abc.com", "@gmail.com").
 * 3. Rejects leading, trailing, or consecutive dots ("..").
 * 4. Rejects single-character or non-alphabetic TLDs (".c", ".123").
 * 5. Rejects known disposable, burner, temporary, and placeholder domains (e.g. "abc.com", "mailinator.com", "tempmail.com").
 */

export const BLOCKED_EMAIL_DOMAINS = new Set([
  // Generic placeholder / test domains
  'abc.com',
  'test.com',
  'fake.com',
  'dummy.com',
  'sample.com',
  'invalid.com',
  'nomail.com',
  'noreply.com',
  'none.com',
  'temp.com',
  // Disposable / temporary mail services
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'throwaway.email',
  'throwawaymail.com',
  'throwam.com',
  'dispostable.com',
  'disposable.com',
  'disposablemail.com',
  'disposableinbox.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'trashmail.at',
  'trashmail.io',
  'trashmail.org',
  'trashinbox.com',
  'trash-mail.at',
  'mailnull.com',
  'mailnew.com',
  'mailnesia.com',
  'mailsac.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator2.com',
  'mailinator.net',
  'mailinater.com',
  'mailforspam.com',
  'mailfreeonline.com',
  'mailnull.com',
  'mailseal.com',
  'mailslapping.com',
  'mailsucker.net',
  'mailzilla.org',
  'mailtome.de',
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  '10minutemail.co.uk',
  '10minutemail.de',
  '10minutemail.ru',
  '10minutemail.info',
  '10minmail.de',
  '20minutemail.com',
  '20minutemail.it',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'burnermail.io',
  'burner.com',
  'burnthis.com',
  'dropmail.me',
  'getairmail.com',
  'mohmal.com',
  'inboxkitten.com',
  'nada.ltd',
  'nada.email',
  'crazymailing.com',
  'mytemp.email',
  'fakemail.net',
  'fakeinbox.com',
  'fakermail.com',
  'generator.email',
  'tempinbox.com',
  'tempr.email',
  'tempsky.com',
  'spamfree24.org',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spamherelots.com',
  'spamhereplease.com',
  'spamhole.com',
  'spamify.com',
  'spaml.de',
  'spammotel.com',
  'spamoff.de',
  'spamspot.com',
  'spamstack.net',
  'spamthis.co.uk',
  'spamthisplease.com',
  'spam.la',
  'spaml.com',
  'spamtrail.com',
  'spamwc.de',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'filzmail.com',
  'filzmail.de',
  'jetable.com',
  'jetable.fr',
  'jetable.net',
  'jetable.org',
  'kurzepost.de',
  'objectmail.com',
  'obobbo.com',
  'oneoffemail.com',
  'onewaymail.com',
  'online.ms',
  'pookmail.com',
  'put2.net',
  'quickinbox.com',
  'rcpt.at',
  'rppkn.com',
  'rtrtr.com',
  's0ny.net',
  'safe-mail.net',
  'safersignup.de',
  'safetymail.info',
  'safetypost.de',
  'spamfree.eu',
  'temporaryemail.com',
  'temporaryemail.net',
  'tempsky.com',
  'thankyou2010.com',
  'thecloudindex.com',
  'thedoghousemail.com',
  'thisisnotmyrealemail.com',
  'throam.com',
  'throwam.com',
  'tilien.com',
  'tittbit.in',
  'tmail.com',
  'topsecretmail.com',
  'tradermail.info',
  'uggsrock.com',
  'uroid.com',
  'us.af',
  'venompen.com',
  'veryrealemail.com',
  'vkcode.ru',
  'vmani.com',
  'vomoto.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'wh4f.org',
  'whyspam.me',
  'willhackforfood.biz',
  'willselfdestruct.com',
  'wuzupmail.net',
  'xn--9kq967o.com',
  'xsecurity.org',
  'xteamexpert.com',
  'xwaretech.com',
  'xwaretech.info',
  'xwaretech.net',
  'yanet.me',
  'yapped.net',
  'yeah.net',
  'yep.it',
  'yogamaven.com',
  'yopmail.pp.ua',
  'youmailr.com',
  'yours.com',
  'ypmail.webarnak.fr.eu.org',
  'yroid.com',
  'zehnminutenmail.de',
  'zipcad.com',
  'zippymail.info',
  'zoemail.com',
  'zoemail.net',
  'zoemail.org',
  'zomail.net',
  'zxcv.com',
  'zxcvbnm.com',
])

const EMAIL_SYNTAX_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

export function validateEmailSecurity(rawEmail) {
  if (typeof rawEmail !== 'string') {
    return { valid: false, message: 'Enter a valid email address.' }
  }

  const email = rawEmail.trim().toLowerCase()

  if (!email) {
    return { valid: false, message: 'Email address cannot be empty.' }
  }

  if (email.length > 254) {
    return { valid: false, message: 'Email address cannot exceed 254 characters.' }
  }

  if (!email.includes('@')) {
    return { valid: false, message: 'Email must contain an @ symbol.' }
  }

  const atIndex = email.indexOf('@')
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  if (!local || local.length === 0) {
    return { valid: false, message: 'Enter a valid email address with a username before @ (e.g. name@domain.com).' }
  }

  if (local.length > 64) {
    return { valid: false, message: 'Username part of email cannot exceed 64 characters.' }
  }

  if (local.startsWith('.') || local.endsWith('.')) {
    return { valid: false, message: 'Email username cannot begin or end with a dot.' }
  }

  if (local.includes('..')) {
    return { valid: false, message: 'Email username cannot contain consecutive dots.' }
  }

  if (!domain || domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) {
    return { valid: false, message: 'Enter a valid domain name with an extension (e.g. domain.com).' }
  }

  if (domain.includes('..')) {
    return { valid: false, message: 'Domain name cannot contain consecutive dots.' }
  }

  const domainParts = domain.split('.')
  const tld = domainParts[domainParts.length - 1]

  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return { valid: false, message: 'Email domain extension must be at least 2 letters (e.g. .com, .in).' }
  }

  if (!EMAIL_SYNTAX_REGEX.test(email)) {
    return { valid: false, message: 'Enter a valid email address.' }
  }

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      message: 'Disposable, temporary, or dummy email addresses are not allowed. Please use a valid personal or business email.',
    }
  }

  return { valid: true, email }
}
