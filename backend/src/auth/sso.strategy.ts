import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, BearerStrategy } from 'passport-azure-ad';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Configuration details
const ALLOWED_ENTERPRISE_DOMAINS = ['company.com', 'enterprise.org', 'ecoride-partner.corp'];

@Injectable()
export class AzureAdStrategy extends PassportStrategy(Strategy, 'azure-ad') {
  constructor() {
    super({
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_CLIENT_ID,
      responseType: 'code id_token',
      responseMode: 'form_post',
      redirectUrl: `${process.env.BACKEND_URL}/auth/azure/callback`,
      allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      validateIssuer: true,
      passReqToCallback: false,
      loggingLevel: 'info',
    });
  }

  async validate(profile: any): Promise<any> {
    if (!profile || !profile.upn) {
      throw new UnauthorizedException('Authentication credentials missing from Microsoft Azure profile');
    }

    const email = profile.upn.toLowerCase();
    const domain = email.split('@')[1];

    if (!ALLOWED_ENTERPRISE_DOMAINS.includes(domain)) {
      throw new UnauthorizedException(
        `Access Denied: The domain '${domain}' is not authorized. EcoRide requires a verified corporate SSO email.`
      );
    }

    return {
      ssoProvider: 'AzureAD',
      ssoId: profile.oid,
      email: email,
      fullName: profile.displayName || `${profile.givenName} ${profile.familyName}`,
    };
  }
}

@Injectable()
export class GoogleWorkspaceStrategy extends PassportStrategy(GoogleStrategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<any> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    
    if (!email) {
      return done(new UnauthorizedException('No email returned from Google authentication provider'), false);
    }

    const domain = email.split('@')[1];

    if (!ALLOWED_ENTERPRISE_DOMAINS.includes(domain)) {
      return done(
        new UnauthorizedException(
          `Access Denied: Personal Google accounts are not permitted. Please use your verified Workspace account.`
        ),
        false
      );
    }

    done(null, {
      ssoProvider: 'GoogleWorkspace',
      ssoId: profile.id,
      email: email,
      fullName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
