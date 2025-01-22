# Discord Bot Middleware for Foundry VTT

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](https://github.com/Dusttoo/discord_middleware)

The **Discord Bot Middleware** is the core WebSocket layer that bridges the gap between the Discord API and Foundry Virtual Tabletop (VTT). It facilitates seamless communication between players on Discord and Foundry VTT, offering real-time gameplay automation, session management, character updates, and more.

---

## Key Features

- **Real-Time Synchronization**: Integrates Discord and Foundry VTT using WebSocket communication.
- **Comprehensive Character Management**: Enables actions like updating HP, conditions, inventory, and spell usage.
- **Session Management**: Supports starting and ending sessions, logging notes, and notifying participants.
- **Combat Automation**: Rolls for initiative, attacks, saving throws, and applies damage or healing automatically.
- **Customizable API Hooks**: Extendable for additional game-specific requirements.
- **Quest and NPC Management**: View, update, and manage quest logs and NPC stats directly.

---

## How It Works

1. **Command Input**: Players send commands through Discord (e.g., `/roll`, `/start-session`, `/query-npc`).
2. **Middleware Processing**:
   - Commands are processed by the middleware.
   - WebSocket requests are forwarded to Foundry VTT.
3. **Action Execution**:
   - Foundry VTT executes actions like rolling dice, updating stats, or generating encounters.
   - Results are returned to the middleware and relayed to Discord.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dusttoo/discord_middleware.git
   cd discord_middleware
   ```
2.	Install dependencies:
	  ```bash
     git clone https://github.com/Dusttoo/discord_middleware.git
     cd discord_middleware
   
3.	Configure your environment variables in .env:
    ```bash
    DISCORD_API_TOKEN=your_discord_token
    FOUNDRY_API_URL=http://your-foundry-url
    FOUNDRY_API_KEY=your_foundry_api_key

4.	Start the middleware:
    ```bash
    npm start
---
## Configuration

Key configuration settings for the middleware can be managed through a `.env` file and Foundry VTT settings. Below are the essential configuration options:

### Environment Variables (`.env`)
These are used to manage the middleware setup:

| Variable             | Description                                             |
|----------------------|---------------------------------------------------------|
| `DISCORD_API_TOKEN`  | Discord bot token for authenticating API requests.       |
| `FOUNDRY_API_URL`    | The base URL of your Foundry VTT server.                 |
| `FOUNDRY_API_KEY`    | API key for secure communication with Foundry VTT.       |
| `MIDDLEWARE_URL`     | URL where the middleware is hosted.                      |
| `DEBUG_MODE`         | Set to `true` to enable verbose logging for debugging.   |
| `NOTIFICATION_CHANNEL` | Discord channel ID for system notifications.           |

### Foundry Settings
Configurable directly in Foundry's settings UI:

- **Use `.env` for Development**: Load environment variables from a `.env` file during development.
- **Discord API Token**: Token required to connect the Discord bot.
- **Middleware URL**: The endpoint for the middleware server.
- **Debug Mode**: Enable verbose logging in the console for debugging.
- **Discord Notification Channel ID**: Specify the Discord channel where in-game notifications will be posted.

---

## Example Use Cases

### 1. Real-Time Character Management
Players can interact with their characters via Discord commands, and the changes are reflected instantly in Foundry VTT:

- `/update-hp @character -10`: Decreases the character's HP by 10.
- `/add-item @character "Potion of Healing"`: Adds a "Potion of Healing" to the character's inventory.

### 2. Combat Automation
Automates key combat mechanics, enhancing immersion and reducing the workload for the game master:

- `/roll-initiative`: Rolls initiative for all characters and updates the combat order.
- `/attack @attacker @target`: Simulates an attack, calculates the result, and applies damage automatically.

### 3. Session Management
Manage your game sessions effortlessly:

- `/start-session "Campaign Kickoff"`: Begins a new session and notifies all players.
- `/end-session`: Concludes the current session and saves the session notes.

---

## API Endpoints

The middleware communicates via WebSocket and provides the following key actions:

| Endpoint                 | Description                                          |
|--------------------------|------------------------------------------------------|
| `updateCharacterHP`      | Updates a character's hit points.                   |
| `rollInitiative`         | Rolls initiative for a specific character.           |
| `castSpell`              | Casts a spell and applies its effects.              |
| `updateQuestStatus`      | Updates the status of a quest.                      |
| `sendTurnNotification`   | Sends a notification for a character's combat turn. |

---

## Example Commands

Here’s a list of sample commands supported by the middleware-integrated Discord bot:

- **Character Management**:
  - `/stats @character`: Retrieve a character’s current stats.
  - `/inventory @character`: Display the character’s inventory.
- **Combat**:
  - `/roll-initiative`: Automatically rolls initiative for combat participants.
  - `/attack @attacker @target`: Resolves an attack, including hit calculation and damage application.
- **Session Management**:
  - `/start-session "Session Title"`: Start a new session and notify players.
  - `/log-notes "Important discovery about the artifact"`: Add a note to the session log.

---

## Technologies Used

The Discord Bot Middleware leverages modern web technologies and frameworks:

- **Node.js**: Powers the backend logic of the middleware.
- **WebSocket**: Enables real-time communication between Discord and Foundry VTT.
- **Foundry VTT**: Integrates with the popular virtual tabletop platform.
- **Discord.js**: Handles Discord bot functionality and interactions.

---

## Contributing

We welcome contributions! If you’d like to add features, report bugs, or suggest improvements:

1. **Fork the Repository**: Clone the project and create your feature branch:
   ```bash
   git checkout -b feature-branch-name
2.	Commit Changes: Save your progress with detailed commit messages:
    ```bash
    git commit -m "Add feature description"
3.	Push and Submit a PR: Push your branch and open a pull request on GitHub:
    ```bash
    git push origin feature-branch-name

---

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute the code as permitted by the license terms. We encourage open-source contributions and adaptations to suit your specific needs.

---

## Acknowledgments

Special thanks to the following communities and tools that made this project possible:

- **Foundry VTT Community**: For creating a feature-rich virtual tabletop that brings TTRPG campaigns to life.
- **Discord.js Developers**: For providing a robust library that simplifies Discord bot development.
- **RPG Enthusiasts and GMs**: For inspiring the development of tools that enhance immersive gameplay.

Your passion and creativity drive innovation in this space!

---

## Future Enhancements

Planned updates to further improve the middleware and user experience include:

- **Advanced Combat Features**: 
  - Implementation of area-of-effect (AoE) spell handling.
  - Complex condition tracking and automated resolution.
- **Expanded API Endpoints**: Adding support for more in-game actions and character interactions.
- **Multi-Platform Integration**: Extending compatibility to other virtual tabletop platforms beyond Foundry VTT.
- **Enhanced Discord Commands**: Enabling more detailed character management and session planning directly from Discord.

---

## Feedback and Support

We value your feedback! If you encounter any issues or have suggestions for improvement, please:

1. Open an issue on the [GitHub repository](https://github.com/Dusttoo/discord_middleware).
2. Join the discussion with other users and contributors to share ideas.
3. Contact the repository maintainer directly via GitHub.

For support, detailed documentation, and usage examples, check the repository's [Wiki](https://github.com/Dusttoo/discord_middleware/wiki).

---

## Get Involved

Contributions are always welcome! Here’s how you can contribute:

- **Report Bugs**: Use the GitHub issue tracker to report any bugs or inconsistencies.
- **Suggest Features**: Share your ideas for new features or improvements.
- **Submit Code**: Fork the repository, work on a feature, and submit a pull request.

Let’s build something great together to enhance tabletop gaming experiences for everyone.

---

Ready to take your campaigns to the next level? Start integrating the **Discord Bot Middleware** today!

