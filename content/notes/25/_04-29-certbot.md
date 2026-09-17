---
title: "certbot"
date: 2025-04-29
---
I bought a domain name but didn't set ssl certificates yet. So I was searching how to set the things for using ssl certificates. 
From my domain register, I couldn't find any free way to get ssl certificates, so I decided to use [Let's Encrypt](https://letsencrypt.org), which is well known for free ssl/tls certificate provider.  
  
To get the certificate from Let's Encrypt, I had to use [ACME client](https://letsencrypt.org/docs/client-options/), and decided to use [Certbot](https://certbot.eff.org/).  
  
In this note, I'm going to summarize following two things:
- How the Certbot works to get ssl certificate
- How can I set up my environment: Certbot + Nginx  
  
# 1. How the Certbot(ACME client) works?
__ACME Protocol__  
Certbot relies on the Automated Certificate Management Environment (ACME) protocol, which is the standard that Let's Encrypt uses for automating certificate issuance and domain validation.  
  
__Domain Validation Process__  
Certbot primarily uses two main types of "challenges" defined by the ACME protocol to prove that you control the domain for which you're requesting a certificate.
  
## A. HTTP-01 
You can find [detail here](https://letsencrypt.org/docs/challenge-types/).  
This method doesn't require to manually modify DNS records.  
  
`http://<YOUR_DOMAIN>/.well-known/acme-challenge/<TOKEN>`

1. When you run Certbot and request a certificate for your domain (e.g., docker-registry.rst0070.com), the Let's Encrypt server (or another ACME CA) gives your Certbot client a unique token.
2. Certbot then configures your web server (like Nginx or Apache) to serve this token at a specific well-known URL path under your domain, typically .well-known/acme-challenge/<random_filename>.
3. The Let's Encrypt server then makes an HTTP request to this specific URL on your domain. If it can successfully retrieve the token, it confirms that you control the domain.
4. Once the validation is successful, Let's Encrypt issues the SSL certificate to your Certbot client.
5. Certbot can then automatically install this certificate and configure your web server to use it
  
## B. DNS-01
Detail is [here](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge).  
It uses modification on DNS record to prove the owner has control on the Domain name. 
I don't prefer this method so I will pass the details of it.  
  
# 2. Certbot + Nginx
https://certbot.eff.org/instructions?ws=nginx&os=pip