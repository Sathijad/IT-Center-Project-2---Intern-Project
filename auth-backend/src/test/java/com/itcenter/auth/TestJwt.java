package com.itcenter.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import java.util.List;

/**
 * Helper class for JWT testing with MockMvc
 */
public final class TestJwt {
  private TestJwt() {}
  
  public static SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtUser(String email, String... roles) {
    List<GrantedAuthority> auths = java.util.Arrays.stream(roles)
        .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
        .map(SimpleGrantedAuthority::new)
        .collect(java.util.stream.Collectors.toList());
    
    return SecurityMockMvcRequestPostProcessors.jwt()
        .jwt(j -> j.claim("email", email))
        .authorities(auths.toArray(GrantedAuthority[]::new));
  }
  
  public static SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtUserWithSub(String sub, String email, String... roles) {
    List<GrantedAuthority> auths = java.util.Arrays.stream(roles)
        .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
        .map(SimpleGrantedAuthority::new)
        .collect(java.util.stream.Collectors.toList());
    
    return SecurityMockMvcRequestPostProcessors.jwt()
        .jwt(j -> j.claim("sub", sub).claim("email", email))
        .authorities(auths.toArray(GrantedAuthority[]::new));
  }
}

