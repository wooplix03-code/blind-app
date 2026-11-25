<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class WezeyWebNavigationController extends Controller
{
    /**
     * Accessible Voice-First Navigation Tree for www.wezey.com
     */
    protected array $siteStructure = [
        'home' => [
            'title' => 'Wezey - Accessible Social Media & AI Vision Platform',
            'url' => 'https://www.wezey.com',
            'summary' => 'Welcome to Wezey official website. Wezey is the world\'s first AI-powered voice and gesture platform built for blind and visually impaired individuals.',
            'sections' => [
                'hero' => 'Empowering independent living through voice-first technology, real-time spatial vision, and accessible social networking.',
                'mission' => 'Eliminating visual barriers by transforming every smartphone into a smart assistive companion.',
                'mobile_apps' => 'Download Wezey on Android and iOS with universal gesture navigation and live AI assistance.',
            ],
            'voice_navigation_commands' => ['go to about', 'features', 'contact', 'download', 'register'],
        ],
        'about' => [
            'title' => 'About Wezey - Our Mission & Vision',
            'url' => 'https://www.wezey.com/about',
            'summary' => 'Wezey was founded with the mission to give visually impaired people 100% digital independence without needing sighted assistance.',
            'sections' => [
                'vision' => 'A world where accessibility is built into the core architecture of every tool, not added as an afterthought.',
                'team' => 'Built by accessibility UX engineers, machine learning researchers, and visually impaired community advocates.',
            ],
            'voice_navigation_commands' => ['features', 'home', 'contact'],
        ],
        'features' => [
            'title' => 'Wezey Accessibility Features',
            'url' => 'https://www.wezey.com/features',
            'summary' => 'Key features include: Global Full-Screen Gestures, Shake sensor navigation, Neural Voice Interaction, AI Surroundings Vision, Accessible Social Feed, and Layman AI Search.',
            'sections' => [
                'gestures' => 'Full-screen gestures: Swipe left to go back, swipe right for ask questions, swipe up for visualization, swipe down to switch between Malay and English.',
                'sensors' => 'Shake device once to return to Main Menu. Shake twice to access User Profile.',
                'vision' => 'Real-time AI camera analyzes surroundings, counts people, detects pathways, and answers questions about nearby restaurants and obstacles.',
            ],
            'voice_navigation_commands' => ['home', 'about', 'contact', 'download'],
        ],
        'contact' => [
            'title' => 'Contact Wezey Support & Community',
            'url' => 'https://www.wezey.com/contact',
            'summary' => 'Get in touch with the Wezey accessibility support team at support@wezey.com or call our toll-free assistance helpline.',
            'sections' => [
                'email' => 'support@wezey.com',
                'phone' => '+60 12-345 6789',
                'address' => 'Bandar Sri Damansara, Kuala Lumpur, Malaysia',
            ],
            'voice_navigation_commands' => ['home', 'features', 'about'],
        ],
    ];

    /**
     * Browse and navigate www.wezey.com via voice commands
     */
    public function navigate(Request $request)
    {
        $target = strtolower(trim($request->input('target', 'home')));
        
        if (str_contains($target, 'about')) {
            $key = 'about';
        } elseif (str_contains($target, 'feature') || str_contains($target, 'capability')) {
            $key = 'features';
        } elseif (str_contains($target, 'contact') || str_contains($target, 'help') || str_contains($target, 'support')) {
            $key = 'contact';
        } else {
            $key = 'home';
        }

        $page = $this->siteStructure[$key];

        $spokenText = "Navigating to {$page['title']}. {$page['summary']} You can say: " . implode(', or ', $page['voice_navigation_commands']) . ".";

        return response()->json([
            'success' => true,
            'page_key' => $key,
            'page_title' => $page['title'],
            'url' => $page['url'],
            'summary' => $page['summary'],
            'sections' => $page['sections'],
            'voice_commands' => $page['voice_navigation_commands'],
            'spoken_text' => $spokenText,
        ]);
    }

    /**
     * Full voice sitemap
     */
    public function sitemap()
    {
        return response()->json([
            'success' => true,
            'website' => 'https://www.wezey.com',
            'pages' => array_keys($this->siteStructure),
            'structure' => $this->siteStructure,
        ]);
    }
}
