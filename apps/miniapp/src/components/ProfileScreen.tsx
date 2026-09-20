import { useReducer } from 'react';
import type { ProfileViewModel } from '../view-model/profile.ts';
import { createProfileUiState, profileUiReducer } from '../view-model/profile.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { Icon } from './Icon.tsx';

interface ProfileScreenProps {
  model: ProfileViewModel;
  onNavigate?: (id: string) => void;
}

const designNavigation = ['home', 'search', 'profile'] as const;

export function ProfileScreen({ model, onNavigate }: ProfileScreenProps) {
  const [state, dispatch] = useReducer(profileUiReducer, model, createProfileUiState);
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="profile-screen">
      <header className="profile-header">
        <span aria-hidden="true" />
        <h1>{model.title}</h1>
        <button type="button" className="profile-settings-action" aria-label="Настройки" disabled>
          <Icon name="settings" />
        </button>
      </header>

      <button type="button" className="profile-identity-card" aria-label={model.name + ', ' + model.city + '. Редактирование профиля недоступно'} disabled>
        <img src={model.avatar} alt={model.avatarAlt} />
        <span className="profile-identity-copy"><strong>{model.name}</strong><span>{model.city}</span></span>
        <Icon name="chevronRight" />
      </button>

      {model.preferenceSections.map(section => {
        const editing = state.editingSection === section.id;
        const selected = state.selectedChipIds[section.id];
        return <section className={'profile-preference-section' + (editing ? ' is-editing' : '')} aria-labelledby={'profile-' + section.id} key={section.id}>
          <div className="profile-section-heading">
            <h2 id={'profile-' + section.id}>{section.title}</h2>
            <button type="button" aria-expanded={editing} onClick={() => dispatch({ type: 'TOGGLE_EDIT', sectionId: section.id })}>
              {editing ? 'Готово' : 'Изменить'}
            </button>
          </div>
          <div className="profile-chip-list">
            {section.chips.map(chip => <button
              type="button"
              className={'profile-chip' + (selected.includes(chip.id) ? ' is-selected' : '')}
              key={chip.id}
              aria-pressed={selected.includes(chip.id)}
              disabled={!editing}
              onClick={() => dispatch({ type: 'TOGGLE_CHIP', sectionId: section.id, chipId: chip.id })}
            >{chip.label}</button>)}
            <button type="button" className="profile-chip profile-chip-add" aria-label={'Добавить: ' + section.title} disabled>
              <Icon name="plus" />
            </button>
          </div>
        </section>;
      })}

      <section className="profile-preference-rows" aria-label="Предпочтения для подбора событий">
        {model.preferenceRows.map(row => <button
          type="button"
          className={'profile-preference-row profile-preference-row-' + row.id}
          key={row.id}
          onClick={row.id === 'notifications' ? () => dispatch({ type: 'TOGGLE_NOTIFICATIONS' }) : undefined}
          disabled={row.id !== 'notifications'}
        >
          <Icon name={row.icon} />
          <span><strong>{row.label}</strong><small>{row.id === 'notifications' && !state.notificationsEnabled ? 'Выключены' : row.value}</small></span>
          <Icon name="chevronRight" />
        </button>)}
      </section>

      <section className="profile-contact-section" aria-labelledby="profile-contact-heading">
        <div className="profile-section-heading">
          <h2 id="profile-contact-heading">Всё ещё на связи</h2>
          <button type="button" disabled>Изменить</button>
        </div>
        <div className="profile-contact-list">
          {model.contacts.map(contact => <button type="button" className={'profile-contact profile-contact-' + contact.id} key={contact.id} aria-label={contact.label + ': подключение недоступно'} disabled>
            <span aria-hidden="true">{contact.id === 'vk' ? 'VK' : '➤'}</span>
          </button>)}
          <button type="button" className="profile-contact profile-contact-add" aria-label="Добавление внешнего аккаунта недоступно" disabled><Icon name="plus" /></button>
        </div>
      </section>

      <button type="button" className="profile-settings-row" disabled>
        <Icon name="settings" /><span>Настройки</span><Icon name="chevronRight" />
      </button>
    </Screen>
    <BottomNav active="profile" onSelect={onNavigate} availableIds={designNavigation} />
  </AppViewport>;
}
