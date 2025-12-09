<?php
/**
 * PMO Chatbot Uninstall
 *
 * Removes all plugin data when the plugin is deleted.
 */

// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete plugin options
delete_option('pmo_chatbot_api_url');
delete_option('pmo_chatbot_config_id');
delete_option('pmo_chatbot_enabled');
delete_option('pmo_chatbot_exclude_pages');
