<?php
/**
 * Plugin Name: PMO Chatbot
 * Plugin URI: https://github.com/your-org/pmo-chatbot
 * Description: Embed AI-powered customer service chatbot on your WordPress site. Easy setup with just your API URL and Config ID.
 * Version: 1.0.0
 * Author: PMO Platform
 * Author URI: https://pmo-platform.com
 * License: MIT
 * Text Domain: pmo-chatbot
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('PMO_CHATBOT_VERSION', '1.0.0');
define('PMO_CHATBOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PMO_CHATBOT_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main PMO Chatbot class
 */
class PMO_Chatbot {

    private static $instance = null;

    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));

        // Register settings
        add_action('admin_init', array($this, 'register_settings'));

        // Enqueue frontend script
        add_action('wp_footer', array($this, 'enqueue_chatbot_script'));

        // Add settings link to plugins page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_settings_link'));

        // Register shortcode
        add_shortcode('pmo_chatbot', array($this, 'render_shortcode'));
    }

    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        add_options_page(
            __('PMO Chatbot Settings', 'pmo-chatbot'),
            __('PMO Chatbot', 'pmo-chatbot'),
            'manage_options',
            'pmo-chatbot',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('pmo_chatbot_settings', 'pmo_chatbot_api_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => '',
        ));

        register_setting('pmo_chatbot_settings', 'pmo_chatbot_config_id', array(
            'type' => 'string',
            'sanitize_callback' => 'absint',
            'default' => '',
        ));

        register_setting('pmo_chatbot_settings', 'pmo_chatbot_enabled', array(
            'type' => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => true,
        ));

        register_setting('pmo_chatbot_settings', 'pmo_chatbot_exclude_pages', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '',
        ));

        // Settings sections
        add_settings_section(
            'pmo_chatbot_main_section',
            __('Chatbot Configuration', 'pmo-chatbot'),
            array($this, 'render_section_description'),
            'pmo-chatbot'
        );

        // Settings fields
        add_settings_field(
            'pmo_chatbot_api_url',
            __('API URL', 'pmo-chatbot'),
            array($this, 'render_api_url_field'),
            'pmo-chatbot',
            'pmo_chatbot_main_section'
        );

        add_settings_field(
            'pmo_chatbot_config_id',
            __('Chatbot Config ID', 'pmo-chatbot'),
            array($this, 'render_config_id_field'),
            'pmo-chatbot',
            'pmo_chatbot_main_section'
        );

        add_settings_field(
            'pmo_chatbot_enabled',
            __('Enable Chatbot', 'pmo-chatbot'),
            array($this, 'render_enabled_field'),
            'pmo-chatbot',
            'pmo_chatbot_main_section'
        );

        add_settings_field(
            'pmo_chatbot_exclude_pages',
            __('Exclude Pages', 'pmo-chatbot'),
            array($this, 'render_exclude_pages_field'),
            'pmo-chatbot',
            'pmo_chatbot_main_section'
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        // Show success message after save
        if (isset($_GET['settings-updated'])) {
            add_settings_error('pmo_chatbot_messages', 'pmo_chatbot_message', __('Settings saved.', 'pmo-chatbot'), 'updated');
        }

        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

            <?php settings_errors('pmo_chatbot_messages'); ?>

            <form action="options.php" method="post">
                <?php
                settings_fields('pmo_chatbot_settings');
                do_settings_sections('pmo-chatbot');
                submit_button(__('Save Settings', 'pmo-chatbot'));
                ?>
            </form>

            <hr>

            <h2><?php _e('Shortcode Usage', 'pmo-chatbot'); ?></h2>
            <p><?php _e('You can also embed the chatbot on specific pages using the shortcode:', 'pmo-chatbot'); ?></p>
            <code>[pmo_chatbot]</code>
            <p><?php _e('Or with custom parameters:', 'pmo-chatbot'); ?></p>
            <code>[pmo_chatbot config_id="123" theme="dark"]</code>

            <hr>

            <h2><?php _e('Need Help?', 'pmo-chatbot'); ?></h2>
            <p>
                <?php _e('Find your Config ID in the PMO Platform under AI Tools > Chatbot > Website Integration tab.', 'pmo-chatbot'); ?>
            </p>
        </div>
        <?php
    }

    /**
     * Render section description
     */
    public function render_section_description() {
        echo '<p>' . __('Configure your PMO Chatbot settings below. You\'ll need your API URL and Config ID from the PMO Platform.', 'pmo-chatbot') . '</p>';
    }

    /**
     * Render API URL field
     */
    public function render_api_url_field() {
        $value = get_option('pmo_chatbot_api_url', '');
        ?>
        <input type="url"
               name="pmo_chatbot_api_url"
               value="<?php echo esc_attr($value); ?>"
               class="regular-text"
               placeholder="https://your-api.example.com">
        <p class="description">
            <?php _e('The base URL of your PMO API (e.g., https://api.pmo-platform.com)', 'pmo-chatbot'); ?>
        </p>
        <?php
    }

    /**
     * Render Config ID field
     */
    public function render_config_id_field() {
        $value = get_option('pmo_chatbot_config_id', '');
        ?>
        <input type="number"
               name="pmo_chatbot_config_id"
               value="<?php echo esc_attr($value); ?>"
               class="small-text"
               min="1"
               placeholder="123">
        <p class="description">
            <?php _e('Your chatbot configuration ID from the PMO Platform.', 'pmo-chatbot'); ?>
        </p>
        <?php
    }

    /**
     * Render enabled field
     */
    public function render_enabled_field() {
        $value = get_option('pmo_chatbot_enabled', true);
        ?>
        <label>
            <input type="checkbox"
                   name="pmo_chatbot_enabled"
                   value="1"
                   <?php checked($value, true); ?>>
            <?php _e('Show chatbot on all pages', 'pmo-chatbot'); ?>
        </label>
        <p class="description">
            <?php _e('Uncheck to disable the chatbot globally. You can still use the shortcode on specific pages.', 'pmo-chatbot'); ?>
        </p>
        <?php
    }

    /**
     * Render exclude pages field
     */
    public function render_exclude_pages_field() {
        $value = get_option('pmo_chatbot_exclude_pages', '');
        ?>
        <input type="text"
               name="pmo_chatbot_exclude_pages"
               value="<?php echo esc_attr($value); ?>"
               class="regular-text"
               placeholder="checkout, cart, my-account">
        <p class="description">
            <?php _e('Comma-separated list of page slugs where the chatbot should not appear.', 'pmo-chatbot'); ?>
        </p>
        <?php
    }

    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="options-general.php?page=pmo-chatbot">' . __('Settings', 'pmo-chatbot') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Check if chatbot should be displayed on current page
     */
    private function should_display_chatbot() {
        // Check if enabled
        if (!get_option('pmo_chatbot_enabled', true)) {
            return false;
        }

        // Check if API URL and Config ID are set
        $api_url = get_option('pmo_chatbot_api_url', '');
        $config_id = get_option('pmo_chatbot_config_id', '');

        if (empty($api_url) || empty($config_id)) {
            return false;
        }

        // Check excluded pages
        $excluded_pages = get_option('pmo_chatbot_exclude_pages', '');
        if (!empty($excluded_pages)) {
            $excluded = array_map('trim', explode(',', $excluded_pages));
            global $post;
            if ($post && in_array($post->post_name, $excluded)) {
                return false;
            }
        }

        // Don't show in admin area
        if (is_admin()) {
            return false;
        }

        return true;
    }

    /**
     * Enqueue chatbot script in footer
     */
    public function enqueue_chatbot_script() {
        if (!$this->should_display_chatbot()) {
            return;
        }

        $api_url = rtrim(get_option('pmo_chatbot_api_url', ''), '/');
        $config_id = get_option('pmo_chatbot_config_id', '');

        if (empty($api_url) || empty($config_id)) {
            return;
        }

        $script_url = $api_url . '/api/chatbot/widget/' . $config_id . '.js';

        echo '<script src="' . esc_url($script_url) . '" async></script>';
    }

    /**
     * Render shortcode
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'config_id' => get_option('pmo_chatbot_config_id', ''),
            'api_url' => get_option('pmo_chatbot_api_url', ''),
            'theme' => 'light',
            'width' => '100%',
            'height' => '500px',
        ), $atts, 'pmo_chatbot');

        $api_url = rtrim($atts['api_url'], '/');
        $config_id = $atts['config_id'];

        if (empty($api_url) || empty($config_id)) {
            return '<!-- PMO Chatbot: Missing API URL or Config ID -->';
        }

        $iframe_url = $api_url . '/api/chatbot/embed/' . $config_id . '?theme=' . esc_attr($atts['theme']);

        return sprintf(
            '<iframe src="%s" width="%s" height="%s" frameborder="0" style="border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>',
            esc_url($iframe_url),
            esc_attr($atts['width']),
            esc_attr($atts['height'])
        );
    }
}

// Initialize plugin
PMO_Chatbot::get_instance();

/**
 * Activation hook
 */
function pmo_chatbot_activate() {
    // Set default options
    add_option('pmo_chatbot_enabled', true);
    add_option('pmo_chatbot_api_url', '');
    add_option('pmo_chatbot_config_id', '');
    add_option('pmo_chatbot_exclude_pages', '');
}
register_activation_hook(__FILE__, 'pmo_chatbot_activate');

/**
 * Deactivation hook
 */
function pmo_chatbot_deactivate() {
    // Optionally clean up transients or cache
}
register_deactivation_hook(__FILE__, 'pmo_chatbot_deactivate');

/**
 * Uninstall hook is in uninstall.php
 */
