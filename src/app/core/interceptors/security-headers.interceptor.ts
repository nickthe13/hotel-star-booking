import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SecurityConfig } from '../security/security.config';

/**
 * HTTP Interceptor for adding security headers
 * Implements security best practices for HTTP communications
 */
export const securityHeadersInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Clone the request and add security headers
  const secureReq = req.clone({
    setHeaders: {
      // Prevent MIME type sniffing
      'X-Content-Type-Options': SecurityConfig.headers['X-Content-Type-Options'],

      // Prevent clickjacking attacks
      'X-Frame-Options': SecurityConfig.headers['X-Frame-Options'],

      // Enable XSS protection in older browsers
      'X-XSS-Protection': SecurityConfig.headers['X-XSS-Protection'],

      // Control referrer information
      'Referrer-Policy': SecurityConfig.headers['Referrer-Policy'],

      // Control browser features and APIs
      'Permissions-Policy': SecurityConfig.headers['Permissions-Policy']
    }
  });

  return next(secureReq);
};
