# AI PPT Generator

An intelligent presentation generator that transforms documents and links into professional slides. It leverages AI API for high-quality content analysis and image generation.

## Background

Current PPT generation tools generally have the following issues:
1. After inputting generation requirements, they cannot strictly adhere to the constraints on the number of pages to be generated, nor do they have restrictions on content generation;
2. After generation, it is impossible to adjust the content of each page;
It is not possible to customize images for each page in a targeted manner.
3. Especially in enterprise and school reporting and presentation scenarios, current PPT generation tools are not very user-friendly.

Therefore, we have conceived the idea of developing a more suitable AI PPT Generator, especially for the aforementioned scenarios.

## Features

- **Multi-Format Upload**: Supports PDF, DOCX, TXT, MD, and Images.
- **Link Analysis**: Can analyze content from provided URLs.
- **AI-Powered Outline**: Generates a structured presentation plan with key points and visual descriptions.
- **High-Quality Slide Images**: Creates visually stunning slide images based on the generated plan and your style preferences.
- **Customizable Styles**: Define your preferred visual style (e.g., Minimalist, Cyberpunk, Corporate).
- **Multi-Language Support**: Full interface and output support for English and Chinese (Simplified).

## Demo
[https://www.ai-biao.com/AIPPT/](https://www.ai-biao.com/AIPPT/)

## Prerequisites

- **Node.js**: Version 18 or higher.
- **Zenmux API Key**: You need an API key from Zenmux to access the AI models.
  - Register and get your key here: [https://zenmux.ai/invite/367KJZ](https://zenmux.ai/invite/367KJZ) (Includes free credits).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/zhiyzheng/auto_PPT_gen.git
    cd auto_PPT_gen
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

### Local Development

1.  **Start the development server:**
    ```bash
    npm run dev
    ```

2.  **Open the application:**
    Visit `http://localhost:5173` (or the port shown in your terminal) in your browser.

3.  **Generate a Presentation:**
    - **Upload**: Drag and drop your documents or paste URLs.
    - **Configure**:
        - Select **Zenmux** as the AI Provider.
        - Enter your **Zenmux API Key**.
        - Set the desired **Slide Count**.
        - (Optional) Enter a **Visual Style** (e.g., "Tech, Blue, Minimalist").
        - (Optional) Add specific **Requirements**.
    - **Generate Plan**: Click "Generate Plan" to create the outline.
    - **Edit**: Review and edit the slide titles, bullet points, and visual descriptions. You can also upload reference images for specific slides.
    - **Generate PPT**: Click "Generate PPT" to render the final high-resolution slide images.
    - **Download**: Download individual slide images or the entire presentation as a ZIP file.

## Deployment

This project is built with Vite and can be easily deployed to any static hosting service。

### Build for Production

1.  **Run the build command:**
    ```bash
    npm run build
    ```
    This will generate a `dist` folder containing the static assets.


### Deploy to Netlify

1.  Drag and drop the `dist` folder to your Netlify dashboard.
    *Or connect your GitHub repository and set the build command to `npm run build` and publish directory to `dist`.*


## License

[MIT](LICENSE)

## designed by 不是懦夫斯基
