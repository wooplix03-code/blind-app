<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 2. user_profiles
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('address')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('accessibility_mode')->default('voice_first'); // voice_first, high_contrast, screen_reader
            $table->timestamps();
        });

        // 3. user_preferences
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->float('speech_rate')->default(1.0);
            $table->float('speech_pitch')->default(1.0);
            $table->string('voice_name')->default('default');
            $table->boolean('screen_reader_hints')->default(true);
            $table->string('gesture_sensitivity')->default('normal'); // sensitive, normal, relaxed
            $table->boolean('audio_cues_enabled')->default(true);
            $table->boolean('auto_read_posts')->default(true);
            $table->timestamps();
        });

        // 4. user_languages
        Schema::create('user_languages', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name');
            $table->string('native_name');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // 5. user_sessions (Extended device and activity logging)
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_type')->nullable(); // android, ios, web
            $table->string('device_os')->nullable();
            $table->string('app_version')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('last_active_at')->useCurrent();
            $table->timestamps();
        });

        // 6. otp_verifications
        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number')->index();
            $table->string('otp_code', 10);
            $table->timestamp('expires_at');
            $table->boolean('verified')->default(false);
            $table->unsignedInteger('attempts')->default(0);
            $table->string('purpose')->default('registration'); // registration, login, profile_update
            $table->timestamps();
        });

        // 7. face_verifications
        Schema::create('face_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('biometric_token')->nullable()->unique();
            $table->string('verification_status')->default('pending'); // pending, verified, failed
            $table->float('confidence_score')->default(0.0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 8. social_posts
        Schema::create('social_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('post_number')->default(1);
            $table->text('caption')->nullable();
            $table->text('ai_caption')->nullable();
            $table->string('location_name')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('media_url')->nullable();
            $table->string('media_type')->default('image'); // image, video
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->boolean('is_public')->default(true);
            $table->timestamps();
        });

        // 9. post_media
        Schema::create('post_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_url');
            $table->string('media_type')->default('image');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->float('blur_score')->nullable();
            $table->float('quality_score')->nullable();
            $table->timestamps();
        });

        // 10. post_tags
        Schema::create('post_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tagged_name')->nullable();
            $table->timestamps();
        });

        // 11. post_likes
        Schema::create('post_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['social_post_id', 'user_id']);
        });

        // 12. post_comments
        Schema::create('post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('comment_text');
            $table->timestamps();
        });

        // 13. post_reports
        Schema::create('post_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reported_by_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('reason');
            $table->string('status')->default('pending'); // pending, reviewed, dismissed, removed
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        // 14. albums
        Schema::create('albums', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('cover_url')->nullable();
            $table->unsignedInteger('posts_count')->default(0);
            $table->timestamps();
        });

        // 15. album_media
        Schema::create('album_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('album_id')->constrained()->cascadeOnDelete();
            $table->foreignId('social_post_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        // 16. ai_conversations
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session_uuid')->unique();
            $table->string('title')->default('Voice Assistant Session');
            $table->string('context_type')->default('general'); // general, visualization, travel, weather, news
            $table->string('last_image_url')->nullable();
            $table->timestamps();
        });

        // 17. ai_messages
        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_conversation_id')->constrained()->cascadeOnDelete();
            $table->enum('sender_role', ['user', 'assistant', 'system'])->default('user');
            $table->text('message_text');
            $table->text('spoken_text')->nullable();
            $table->string('image_context_url')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 18. ai_usage_logs
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('feature'); // chat, vision_caption, visualization_qa, travel, weather, news, translate
            $table->string('model')->default('gpt-4o-mini');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('estimated_cost_usd', 8, 5)->default(0.00000);
            $table->string('status')->default('success'); // success, error
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        // 19. notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->references('id')->on('users')->nullOnDelete();
            $table->string('type'); // like, comment, tag, announcement, security
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // 20. user_activity_logs
        Schema::create('user_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // login, register, voice_command, post_created, image_visualized, language_changed
            $table->string('ip_address', 45)->nullable();
            $table->json('details')->nullable();
            $table->timestamps();
        });

        // 22. admin_roles (Create before admin_users for foreign key)
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // 21. admin_users
        Schema::create('admin_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->foreignId('role_id')->nullable()->constrained('admin_roles')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        // 23. admin_permissions
        Schema::create('admin_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('admin_roles')->cascadeOnDelete();
            $table->string('permission_key');
            $table->timestamps();
        });

        // 24. app_settings
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general'); // general, ai, sms, maps, weather, news
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // 25. api_integrations
        Schema::create('api_integrations', function (Blueprint $table) {
            $table->id();
            $table->string('provider_name')->unique(); // openai, twilio, google_maps, openweather, newsapi
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->string('base_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_integrations');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('admin_permissions');
        Schema::dropIfExists('admin_users');
        Schema::dropIfExists('admin_roles');
        Schema::dropIfExists('user_activity_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('album_media');
        Schema::dropIfExists('albums');
        Schema::dropIfExists('post_reports');
        Schema::dropIfExists('post_comments');
        Schema::dropIfExists('post_likes');
        Schema::dropIfExists('post_tags');
        Schema::dropIfExists('post_media');
        Schema::dropIfExists('social_posts');
        Schema::dropIfExists('face_verifications');
        Schema::dropIfExists('otp_verifications');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('user_languages');
        Schema::dropIfExists('user_preferences');
        Schema::dropIfExists('user_profiles');
    }
};
