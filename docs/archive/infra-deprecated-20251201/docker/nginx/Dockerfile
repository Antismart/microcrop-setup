# NGINX Dockerfile for Production

FROM nginx:1.25-alpine

# Install additional tools
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create custom error pages
COPY <<EOF /usr/share/nginx/html/50x.html
<!DOCTYPE html>
<html>
<head>
    <title>Service Temporarily Unavailable</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
    </style>
</head>
<body>
    <h1>Service Temporarily Unavailable</h1>
    <p>We're experiencing technical difficulties. Please try again in a moment.</p>
    <p><small>Error Code: \$status</small></p>
</body>
</html>
EOF

COPY <<EOF /usr/share/nginx/html/404.html
<!DOCTYPE html>
<html>
<head>
    <title>Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #3498db; }
    </style>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The resource you requested could not be found.</p>
</body>
</html>
EOF

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Use nginx-debug for better logging in non-prod
CMD ["nginx", "-g", "daemon off;"]

# Metadata
LABEL maintainer="MicroCrop DevOps <devops@microcrop.io>"
LABEL description="NGINX Load Balancer for MicroCrop"
LABEL version="1.0.0"
