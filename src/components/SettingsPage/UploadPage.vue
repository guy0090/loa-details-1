<template>
  <q-list>
    <q-item-label header>Log Uploads</q-item-label>

    <q-item tag="label" v-if="uploaderStore.getToken && uploaderStore.getUser" :clickable="false" :focused="false" :manual-focus="true">
      <q-item-section side top>
        <q-avatar size="90px">
          <q-img :src="getUserAvatar(uploaderStore.getUser)" />
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-h5 q-mb-sm">{{ uploaderStore.getUser.discordUsername }}#{{ uploaderStore.getUser.discriminator }}</q-item-label>
        <q-item-label caption>
          <q-btn size="small" color="red" @click="logout()">
            <q-icon name="logout" />
            &nbsp;&nbsp;Logout
          </q-btn>
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-else>
      <q-item-section side top>
        <q-btn color="indigo" size="large" @click="openDiscordLogin()" :disable="uploaderStore.isLoggingIn">
          <q-icon name="discord" />
          &nbsp;&nbsp;Login
        </q-btn>
      </q-item-section>
      <q-item-section>
        <q-item-label>Login with Discord</q-item-label>
        <q-item-label caption>
          In order to upload logs, you must login with Discord.
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-item tag="label">
      <q-item-section side top>
        <q-checkbox v-model="settingsStore.settings.uploads.openOnUpload" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Open On Upload</q-item-label>
        <q-item-label caption>
          Enable to automatically open the uploaded session in your default
          browser.
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-item tag="label" style="display: none!important">
      <q-item-section side top>
        <q-checkbox v-model="settingsStore.settings.uploads.uploadUnlisted" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Private Uploads</q-item-label>
        <q-item-label caption>
          Upload your encounters as unlisted. Unlisted encounters can only be
          viewed with a link.
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-item tag="label">
      <q-item-section side top>
        <q-checkbox v-model="settingsStore.settings.uploads.includeRegion" />
      </q-item-section>

      <q-item-section>
        <q-item-label
          >Include Game Region
          <q-badge color="blue">
            {{
              settingsStore.settings.general.server.replace(/./, (c) =>
                c.toUpperCase()
              )
            }}
          </q-badge>
        </q-item-label>
        <q-item-label caption>
          Include your game region in the upload. This value is taken
          automatically based on your current logger configuration.
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      tag="label"
      :disable="!(uploaderStore.getUser && uploaderStore.getToken)"
    >
      <q-item-section side top>
        <q-checkbox
          :disable="!(uploaderStore.getUser && uploaderStore.getToken)"
          v-model="settingsStore.settings.uploads.uploadLogs"
        />
      </q-item-section>

      <q-item-section>
        <q-item-label>Upload Logged DPS</q-item-label>
        <q-item-label caption>
          Enable to upload your sessions to the web. Requires you to be logged in.
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-separator spaced />

    <q-item tag="label">
      <q-item-section side top>
        <q-btn
          unelevated
          color="negative"
          :label="`${showAdvanced ? 'Hide' : 'Show'} Advanced`"
          @click="showAdvanced = !showAdvanced"
        />
      </q-item-section>

      <q-item-section>
        <q-item-label>For users self-hosting logs</q-item-label>
        <q-item-label caption>
          Modifying any of the settings here may break uploads - careful!
        </q-item-label>
      </q-item-section>
    </q-item>

    <div v-if="showAdvanced" style="margin-top: 25px !important">
      <q-item-label v-if="(uploaderStore.getUser && uploaderStore.getToken)" class="text-h5 q-my-md">
        <q-icon name="warning" color="red" /> You must be logged out to modify these settings.
      </q-item-label>

      <q-item tag="label" :clickable="false" :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)">
        <q-item-section left>
          <q-item-label>API Server&nbsp; </q-item-label>
          <q-item-label caption> URL to API server. </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.api.value"
            type="text"
            label="Upload Server"
            clearable
            clear-icon="refresh"
            @clear="resetURL('api')"
            :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)"
          >
          </q-input>
        </q-item-section>
      </q-item>

      <q-item tag="label" :clickable="false" :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)">
        <q-item-section left>
          <q-item-label>Ingest Server&nbsp; </q-item-label>
          <q-item-label caption> URL to Ingest server. </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.ingest.value"
            type="text"
            label="Ingest Server"
            clearable
            clear-icon="refresh"
            @clear="resetURL('ingest')"
            :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)"
          >
          </q-input>
        </q-item-section>
      </q-item>

      <q-item tag="label" :clickable="false" style="display: none!important;">
        <q-item-section left>
          <q-item-label>Upload Endpoint&nbsp; </q-item-label>
          <q-item-label caption>
            Endpoint for log uploads on API.
          </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.endpoint.value"
            type="text"
            label="Endpoint"
            clearable
            clear-icon="refresh"
            @clear="resetURL('endpoint')"
          >
          </q-input>
        </q-item-section>
      </q-item>

      <q-item tag="label" :clickable="false" :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)">
        <q-item-section left>
          <q-item-label>Frontend&nbsp; </q-item-label>
          <q-item-label caption> URL to frontend. </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.site.value"
            type="text"
            label="Frontend"
            clearable
            clear-icon="refresh"
            @clear="resetURL('site')"
            :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)"
          >
          </q-input>
        </q-item-section>
      </q-item>

      <q-item tag="label" :clickable="false" :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)">
        <q-item-section left>
          <q-item-label>Discord Redirect URL&nbsp; </q-item-label>
          <q-item-label caption> URL for redirect during OAuth2 login. Must be same as configured on API. </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.discordOAuthUrl.value"
            type="text"
            label="Redirect URL"
            clearable
            clear-icon="refresh"
            @clear="resetURL('discordOAuthUrl')"
            :disable="(uploaderStore.getUser !== undefined && uploaderStore.getToken !== undefined)"
          >
          </q-input>
        </q-item-section>
      </q-item>
    </div>
  </q-list>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useSettingsStore } from "src/stores/settings";
import { useUploaderStore } from "src/stores/uploaderStore";

const uploaderStore = useUploaderStore();
const settingsStore = useSettingsStore();

const showAdvanced = ref(false);

// Why isnt this reactive?
// const loggedIn = ref(uploaderStore.getToken && uploaderStore.getUser)

window.messageApi.receive("on-settings-change", (value) => {
  settingsStore.loadSettings(value);

  // Update uploader store
  uploaderStore.setToken(value.uploads.jwt)
  uploaderStore.setUser(value.uploads.user)

  if (value.uploads.jwt && value.uploads.user) uploaderStore.setLoggingIn(false)
});

window.messageApi.receive("discord-login-success", (value) => {
  uploaderStore.setLoggingIn(false)

  uploaderStore.setToken(settingsStore.settings.uploads.jwt)
  uploaderStore.setUser(settingsStore.settings.uploads.user)
});

window.messageApi.receive("discord-login-failure", () => {
  uploaderStore.setLoggingIn(false)

  uploaderStore.setToken(settingsStore.settings.uploads.jwt)
  uploaderStore.setUser(settingsStore.settings.uploads.user)
});

onMounted(() => {
  // Update uploader store
  uploaderStore.setToken(settingsStore.settings.uploads.jwt)
  uploaderStore.setUser(settingsStore.settings.uploads.user)

  console.log(settingsStore.settings.uploads)
});

/**
 * @param {'api' | 'site' | 'ingest' | 'discordOAuthUrl'} type
 */
function resetURL(type) {
  settingsStore.settings.uploads[type].value =
    settingsStore.settings.uploads[type].defaultValue;
}

function openSite(url) {
  window.messageApi.send("window-to-main", {
    message: "open-link",
    value: url,
  });
}

function openDiscordLogin() {
  uploaderStore.setLoggingIn(true)
  window.messageApi.send("window-to-main", {
    message: "open-discord-login",
  });
}

function getUserAvatar(user) {
  if (!user) return "https://cdn.discordapp.com/embed/avatars/0.png"

  const discordCdn = "https://cdn.discordapp.com/"
  let avatar = ""
  if (!user.avatar) {
    avatar = `${discordCdn}/embed/avatars/${parseInt(user.discriminator) % 5}.png`
  } else {
    const isGIF = user.avatar.startsWith("a_")
    avatar = `${discordCdn}avatars/${user.discordId}/${user.avatar}${isGIF ? ".gif" : ".png"}`
  }

  return avatar
}

function logout() {
  uploaderStore.logout()
  settingsStore.settings.uploads.uploadLogs = false
  settingsStore.settings.uploads.user = undefined
  settingsStore.settings.uploads.jwt = ""
}
</script>
