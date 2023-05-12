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
        <q-btn color="indigo" size="large"
          @click="openDiscordLogin()"
          :disable="uploaderStore.isLoggingIn"
          :loading="uploaderStore.isLoggingIn"
        >
          <q-icon name="discord" />
          &nbsp;&nbsp;Login
        </q-btn>
      </q-item-section>
      <q-item-section>
        <q-item-label>Login with Discord</q-item-label>
        <q-item-label caption>
          In order to upload logs, you must login with Discord.
        </q-item-label>
        <q-item-label class="text-red" v-if="loginError !== ''">{{ loginError }}</q-item-label>
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

    <q-item-label header class="q-pb-none">Uploading FAQ</q-item-label>
    <q-item-label caption class="q-pl-md q-mb-md">
      <q-icon name="warning" color="red" />
      The answers in this section cannot be guaranteed if you are using a self-hosted destination.
    </q-item-label>
    <q-item-section top class="q-pl-md q-mb-md">
      <q-item-label>Q: Which encounters can be uploaded?</q-item-label>
      <q-item-label caption class="q-mb-sm">A: Any Guardian Raid or Legion Raid. Anything else will be rejected.</q-item-label>

      <q-item-label>Q: How many encounters can I upload?</q-item-label>
      <q-item-label caption class="q-mb-sm">A: Currently the limit is set to <code>1000</code> uploads. However, you may delete any upload at any time.</q-item-label>

      <q-item-label>Q: What information is stored when I login?</q-item-label>
      <q-item-label caption>
        A: Only the information Discord provides with the <code>'identify'</code>
        <span
          @click="openSite('https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes')"
          class="text-primary"
          style="cursor: pointer"
        > scope</span>.
      </q-item-label>
    </q-item-section>

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
          <q-item-label>Discord Client ID&nbsp;</q-item-label>
          <q-item-label caption>
            Client ID for your
            <span
            @click="openSite(settingsStore.settings.uploads.discordRedirectUrl.value)"
            class="text-primary"
            style="cursor: pointer"
            >Discord OAuth2 Application</span>.
          </q-item-label>
        </q-item-section>
        <q-item-section right>
          <q-input
            v-model="settingsStore.settings.uploads.discordClientId.value"
            type="text"
            label="Client ID"
            clearable
            clear-icon="refresh"
            @clear="resetURL('discordClientId')"
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
            v-model="settingsStore.settings.uploads.discordRedirectUrl.value"
            type="text"
            label="Redirect URL"
            clearable
            clear-icon="refresh"
            @clear="resetURL('discordRedirectUrl')"
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

const settingsStore = useSettingsStore();
const uploaderStore = useUploaderStore();

const showAdvanced = ref(false);
const loginError = ref("");

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
  if (loginError.value !== "") loginError.value = ""

  uploaderStore.setToken(value.token)
  uploaderStore.setUser(value.user)
});

window.messageApi.receive("discord-login-failure", () => {
  uploaderStore.setLoggingIn(false)
  // TOOD: properly pass an error message from main
  loginError.value = "Discord login failed, please try again later."

  uploaderStore.setToken(settingsStore.settings.uploads.jwt)
  uploaderStore.setUser(settingsStore.settings.uploads.user)
});

onMounted(() => {
  // Update uploader store
  uploaderStore.setToken(settingsStore.settings.uploads.jwt)
  uploaderStore.setUser(settingsStore.settings.uploads.user)
});

/**
 * @param {'api' | 'site' | 'ingest' | 'discordClientId' | 'discordRedirectUrl'} type
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
  if (loginError.value !== "") loginError.value = ""
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
