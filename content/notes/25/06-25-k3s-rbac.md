---
title: RBAC with k3s
date: 2025-06-25
---
I'm going to write this note for recording basic concpets of 
Role-Based Access Control (RBAC) in kubernetes, and how to configure that in k3s manually. 
The content would be like:  
1. RBAC concept
2. How to configure RBAC
3. How to sign client csr with k3s
4. How to configure kubectl to include the setting
  
# 1. RBAC concept
Kubernetes doesn't have user based access control. 
Instead of that, It gives permission to role, and bind it to specific names. 
  
You might ask How can we give access only based on name.  
That's why we need certificate.  
  
When we try to use kubernetes api to do something on it, 
we need to show kubernetes our certificate, 
which contains the "name" and signed by the kubernetes cluster's client authority.

```
Role(defines permission)
-> Role Binding (connects Role and Name)
-> Named certificate
```
# 2. How to configure RBAC

## Role
Role defines permissions the role has.  
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: moodmate
  name: admin
rules:
- apiGroups: [""]
  resources: []
```
  

## Role binding
Role Binding connects role to name
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: moodmate
  name: admin
subjects:
- kind: User
  name: "moodmate-cd"
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: manage-pods
  apiGroup: rbac.authorization.k8s.io
```

# 3. How to sign client csr with k3s
To create client certificate that Kubernetes will trust for authentication, 
we need to sign certificate signing request(csr) with k3s cluster's client authority key and certificate.  

(detail) asymmetric cryptography is used: a private key is used for signing, 
and the corresponding public key (embedded in a certificate) is used to verify the signature.  

So we need to do following things:  
- Get k3s private key for signing client csr
- Generate user private key
- Generate configuration file for user certifate
- Generate user csr by user's private key and configuration
- k3s's private key and certificate
  
## Get k3s clinet ca key for signing client certificate
In k3s server's `/var/lib/rancher/k3s/server/tls`, you can find
- for issueing client certificate
  - `client-ca.crt`: used to verify client certificates.
  - `client-ca.key`: used to sign client certificates.
- server certificate
  - `server-ca.crt`: used for setting certificate authority

## Following Process

1. Generate private key for user named `moodmate-cd`

```bash
openssl genrsa -out rst0070.key 2048
```

2. Create a config file for necessary extensions
```bash
cat > moodmate-cd.cnf << EOF
[ req ]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[ req_distinguished_name ]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF
```


3. Generate certificate signing request(csr) including information
```bash
openssl req -new -key moodmate-cd.key -out moodmate-cd.csr -subj "/CN=moodmate-cd/O=moodmate" -config moodmate-cd.cnf
```

4. Generate certification using k3s private key(`client-ca.key`) and certificate(`client-ca.crt`)
```bash
openssl x509 -req -in moodmate-cd.csr -CA client-ca.crt -CAkey client-ca.key -CAcreateserial -out moodmate-cd.crt -days 40 -extensions v3_req -extfile moodmate-cd.cnf
```
  
5. check the certificate
```bash
curl -k --cert moodmate-cd.crt --key moodmate-cd.key https://<your-kube-server>/api/v1/namespaces/moodmate/pods
```
  

# 4. How to configure kubectl to include the setting

Configure cluster. here the server certificate is used.
```bash
export KUBECONFIG=~/.kube/new-config
kubectl config set-cluster <my-cluster-name> \
    --server=https://<cluster-server>:6443 \
    --certificate-authority=server-ca.crt \
    --embed-certs=true
```
  
Add named certificate
```bash
kubectl config set-credentials moodmate-cd \
    --client-certificate=moodmate-cd.crt \
    --client-key=moodmate-cd.key \
    --embed-certs=true
```
  
Set context between the server and name configs.
```bash
kubectl config set-context moodmate-test \
    --cluster=<my-cluster-name> \
    --namespace=moodmate \
    --user=moodmate-cd

kubectl config use-context moodmate-test
```
