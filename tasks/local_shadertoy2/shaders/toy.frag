#version 430
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) out vec4 fragColor;

layout(binding = 0) uniform sampler2D colorTexture;
layout(binding = 1) uniform sampler2D fileImageTexture;

layout (push_constant) uniform AppParameters {
    float iResolutionX;
    float iResolutionY;

    float iMouseX;
    float iMouseY;

    float iTime;
} appParameters;

#define MAX_STEPS 1000
#define MAX_DIST 40.0
#define SURFACE_DIST 0.001
#define PI 3.14159265358979

vec3 lightPos = vec3(2.0, 5.0, 3.0);

mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, 0, s,
        0, 1, 0,
        -s, 0, c
    );
}

mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        1, 0, 0,
        0, c, -s,
        0, s, c
    );
}

float sphereSDF(vec3 p, vec3 center, float radius) {
    return length(p - center) - radius;
}

float planeSDF(vec3 p) {
    return p.y + 5.;
}

float sceneSDF(vec3 p, float time) {
    float bounceHeight = abs(sin(time)) * 0.5;
    vec3 ballCenter = vec3(sin(time) * 1.5, 0.5 + bounceHeight, cos(time) * 1.5);

    float dSphere = sphereSDF(p, ballCenter, 0.5);
    float dPlane = planeSDF(p);

    return min(dSphere, dPlane);
}

vec3 getNormal(vec3 p, float time) {
    float epsilon = 0.001;

    vec3 a = vec3(epsilon, 0, 0);
    vec3 b = vec3(0, epsilon, 0);
    vec3 c = vec3(0, 0, epsilon);

    vec3 n = vec3(
        sceneSDF(p + a, time) - sceneSDF(p - a, time),
        sceneSDF(p + b, time) - sceneSDF(p - b, time),
        sceneSDF(p + c, time) - sceneSDF(p - c, time)
    );

    return normalize(n);
}

float shadow(vec3 ro, vec3 rd, float time) {
    float res = 1.0;
    float t = 0.1;

    for (int i = 0; i < MAX_STEPS; i++) {
        float h = sceneSDF(ro + rd * t, time);

        if (h < SURFACE_DIST) {
            return 0.0;
        }

        res = min(res, 10.0 * h / t);
        t += h;

        if (t > MAX_DIST) {
            break;
        }
    }

    return res;
}

vec3 getLight(vec3 p, vec3 normal, vec3 lightDir, vec3 viewDir, float time) {
    float diff = max(dot(normal, lightDir), 0.0);

    float shadowFactor = shadow(p + normal * SURFACE_DIST * 2.0, lightDir, time);
    diff *= shadowFactor;

    return vec3(0.1) + vec3(1.0) * diff;
}

float rayMarch(vec3 ro, vec3 rd, float time) {
    float dist = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dist;
        float d = sceneSDF(p, time);

        if (d < SURFACE_DIST) {
            return dist;
        }

        dist += d;

        if (dist > MAX_DIST) {
            break;
        }
    }

    return MAX_DIST;
}

vec3 triplanarTexture(vec3 p, vec3 n) {
    return vec3(texture(fileImageTexture, vec2(p.x / 100.0, p.z / 100.0)));
}

vec3 proceduralTexture(vec3 p) {
    return vec3(mod(floor(p.x) + floor(p.y) + floor(p.z), 2.));
}

void main() {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec2 iResolution = vec2(appParameters.iResolutionX, appParameters.iResolutionY);

    vec2 uv = (fragCoord - iResolution.xy * .5) / iResolution.y;
    uv.y = -uv.y;

    float yMove = (appParameters.iMouseX / iResolution.x - 0.5) * 2. * PI;
    float xMove = (appParameters.iMouseY / iResolution.y - 0.5) * PI;

    mat3 rotate = rotateY(yMove) * rotateX(-xMove);
    vec3 cameraPosition = rotate * vec3(0.0, 1.0, 7.0);
    vec3 rayDirection = rotate * normalize(vec3(uv, -2));

    float dist = rayMarch(cameraPosition, rayDirection, appParameters.iTime);

    if (dist >= MAX_DIST) {
        fragColor = vec4(vec3(.2), 1.);
        return;
    }

    vec3 p = cameraPosition + rayDirection * dist;
    vec3 normal = getNormal(p, appParameters.iTime);
    vec3 lightDir = normalize(lightPos - p);
    vec3 viewDir = normalize(cameraPosition - p);
    float dSphere = sphereSDF(
        p,
        vec3(
            sin(appParameters.iTime) * 1.5,
            .5 + abs(sin(appParameters.iTime)) * .5,
            cos(appParameters.iTime) * 1.5
        ),
        .5
    );

    float dPlane = planeSDF(p);

    vec3 color = dSphere < dPlane ?
        triplanarTexture(p, normal) : // the sphere
        triplanarTexture(p, normal) + proceduralTexture(p) * .3; // the plane

    color *= getLight(p, normal, lightDir, viewDir, appParameters.iTime);
    fragColor = vec4(color, 1.);
}