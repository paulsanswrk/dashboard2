<template>
  <div class="container">
    <h1>Hello World!</h1>
    <p>Welcome to your Nuxt 4 app deployed on Vercel</p>
    <div class="info">
      <p>🚀 Built with Nuxt 4</p>
      <p>⚡ Deployed on Vercel</p>
      <p>🎉 Ready to go!</p>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  font-size: 3rem;
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 700;
}

p {
  font-size: 1.2rem;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.info {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.info p {
  margin: 0.5rem 0;
  font-size: 1rem;
}
</style>
