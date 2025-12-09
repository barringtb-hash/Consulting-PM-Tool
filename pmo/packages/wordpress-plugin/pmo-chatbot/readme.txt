=== PMO Chatbot ===
Contributors: pmoplatform
Tags: chatbot, ai, customer service, live chat, support
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: MIT
License URI: https://opensource.org/licenses/MIT

Embed an AI-powered customer service chatbot on your WordPress site with just a few clicks.

== Description ==

PMO Chatbot brings intelligent customer service to your WordPress website. Powered by AI, it can answer customer questions, provide support, and escalate to human agents when needed.

**Features:**

* Easy setup - just enter your API URL and Config ID
* Fully customizable appearance from the PMO Platform
* AI-powered responses with knowledge base integration
* Automatic escalation to human agents
* Works on all pages or specific pages via shortcode
* Dark and light theme support
* Mobile-friendly responsive design

**Requirements:**

* An account on the PMO Platform
* A configured chatbot with a valid Config ID

== Installation ==

1. Upload the `pmo-chatbot` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings > PMO Chatbot
4. Enter your API URL and Config ID from the PMO Platform
5. Save settings

The chatbot will now appear on all pages of your site.

== Frequently Asked Questions ==

= Where do I find my Config ID? =

Log in to the PMO Platform, go to AI Tools > Chatbot, select your chatbot, and click the "Website Integration" tab. Your Config ID is displayed there.

= Can I show the chatbot on specific pages only? =

Yes! Disable the global chatbot in settings, then use the shortcode `[pmo_chatbot]` on specific pages where you want it to appear.

= Can I embed the chatbot as an iframe instead of a floating widget? =

Yes, use the shortcode with additional parameters:
`[pmo_chatbot width="400px" height="600px" theme="light"]`

= How do I exclude the chatbot from certain pages? =

In the plugin settings, enter a comma-separated list of page slugs in the "Exclude Pages" field.

== Screenshots ==

1. Plugin settings page
2. Chatbot widget on frontend
3. Shortcode usage example

== Changelog ==

= 1.0.0 =
* Initial release
* Floating widget support
* Iframe embed shortcode
* Page exclusion settings
* Dark/light theme support

== Upgrade Notice ==

= 1.0.0 =
Initial release of PMO Chatbot for WordPress.
