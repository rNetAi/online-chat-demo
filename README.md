# rNet Ai Chat Demo

This is a professional chat application demo (similar to ChatGPT) that showcases the power of the **RNet ecosystem**.

## The Demo

This project consists of a **React Frontend** and a **Node.js Backend**. It demonstrates a seamless authentication and AI interaction flow:

1.  **Single Sign-On (SSO)**: Users log in once using their RNet account.
2.  **Cross-App Token Usage**: Once authenticated, the user's RNet token is used to pay for AI model costs. 
3.  **Unified Billing**: This demo shows how a single RNet token can be used across different applications (Web, VS Code Extensions, Mobile Apps, etc.) without requiring separate API keys or subscriptions for each service.

## Core Features

- **ChatGPT-like UI**: A clean, modern chat interface with message history.
- **AI Streaming**: Real-time response streaming from Gemini models.
- **Secure Backend**: An Express server that handles OAuth2 PKCE flow and proxies AI requests securely.
- **RNet Integration**: Uses the `@rnet-ai/rnet-sso-node` library for all authentication and AI logic.

## Purpose

The primary goal of this example is to show developers how easy it is to integrate RNet SSO into their own products, allowing their users to bring their own AI credits/tokens to any application in the RNet network.

## License

This project is licensed under the [MIT License](LICENSE).
